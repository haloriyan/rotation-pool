import { useEffect, useRef, useState, useCallback } from "react";

export interface Player {
  username: string;
  joinedAt: number;
}

export interface GameState {
  started: boolean;
  turnOrder: string[];
  currentPlayerIndex: number;
  targetBall: number;
  pocketedBalls: number[];
  scores: Record<string, number>;
  finished: boolean;
}

type RoomStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface RoomState {
  status: RoomStatus;
  players: Player[];
  gameState: GameState | null;
  error?: string;
}

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function useRoom(roomId: string | null, username: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<RoomState>({
    status: "idle",
    players: [],
    gameState: null,
  });

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (!roomId || !username) return;

    let cancelled = false;
    setState({ status: "connecting", players: [], gameState: null });

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) { ws.close(); return; }
      ws.send(JSON.stringify({ type: "join", roomId, username }));
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (cancelled) return;
      let msg: {
        type: string;
        players?: Player[];
        gameState?: GameState | null;
      };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (msg.type === "joined") {
        setState({
          status: "connected",
          players: msg.players ?? [],
          gameState: msg.gameState ?? null,
        });
      } else if (msg.type === "player_joined" || msg.type === "player_left") {
        setState((prev) => ({
          ...prev,
          players: msg.players ?? prev.players,
          gameState: msg.gameState !== undefined ? msg.gameState : prev.gameState,
        }));
      } else if (msg.type === "game_state") {
        setState((prev) => ({ ...prev, gameState: msg.gameState ?? null }));
      }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (!cancelled) setState((prev) => ({ ...prev, status: "disconnected" }));
    };

    ws.onerror = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (!cancelled) setState({ status: "error", players: [], gameState: null, error: "Connection failed" });
    };

    return () => {
      cancelled = true;
      if (pingRef.current) clearInterval(pingRef.current);
      ws.close();
    };
  }, [roomId, username]);

  return { ...state, send };
}
