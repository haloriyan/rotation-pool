import { useEffect, useRef, useState, useCallback } from "react";

export interface Player {
  username: string;
  joinedAt: number;
}

type RoomStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface RoomState {
  status: RoomStatus;
  players: Player[];
  error?: string;
}

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

export function useRoom(roomId: string | null, username: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<RoomState>({
    status: "idle",
    players: [],
  });

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (!roomId || !username) return;

    setState({ status: "connecting", players: [] });

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId, username }));
      pingRef.current = setInterval(() => {
        ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    };

    ws.onmessage = (event) => {
      let msg: { type: string; players?: Player[]; username?: string };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (msg.type === "joined") {
        setState({ status: "connected", players: msg.players ?? [] });
      } else if (msg.type === "player_joined" || msg.type === "player_left") {
        setState((prev) => ({ ...prev, players: msg.players ?? [] }));
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, status: "disconnected" }));
      if (pingRef.current) clearInterval(pingRef.current);
    };

    ws.onerror = () => {
      setState({ status: "error", players: [], error: "Connection failed" });
      if (pingRef.current) clearInterval(pingRef.current);
    };

    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      ws.close();
    };
  }, [roomId, username]);

  return { ...state, send };
}
