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

export interface PendingPoll {
  pollId: string;
  ball: number;
  result: "in" | "foul";
  actor: string;
  expiresAt: number;
  eligibleCount: number;
  rejected: boolean;
  rejections?: number;
}

type RoomStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface RoomState {
  status: RoomStatus;
  players: Player[];
  gameState: GameState | null;
  pendingPoll: PendingPoll | null;
  error?: string;
}

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function useRoom(roomId: string | null, username: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<RoomState>({
    status: "idle",
    players: [],
    gameState: null,
    pendingPoll: null,
  });

  const send = useCallback((payload: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    if (!roomId || !username) return;

    let cancelled = false;
    setState({ status: "connecting", players: [], gameState: null, pendingPoll: null });

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
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type as string;

      if (type === "joined") {
        setState({
          status: "connected",
          players: (msg.players as Player[]) ?? [],
          gameState: (msg.gameState as GameState) ?? null,
          pendingPoll: null,
        });
      } else if (type === "player_joined" || type === "player_left") {
        setState((prev) => ({
          ...prev,
          players: (msg.players as Player[]) ?? prev.players,
          gameState: msg.gameState !== undefined ? (msg.gameState as GameState) : prev.gameState,
        }));
      } else if (type === "game_state") {
        setState((prev) => ({ ...prev, gameState: (msg.gameState as GameState) ?? null }));
      } else if (type === "rejection_poll") {
        setState((prev) => ({
          ...prev,
          pendingPoll: {
            pollId: msg.pollId as string,
            ball: msg.ball as number,
            result: msg.result as "in" | "foul",
            actor: msg.actor as string,
            expiresAt: msg.expiresAt as number,
            eligibleCount: msg.eligibleCount as number,
            rejected: false,
          },
        }));
      } else if (type === "pocket_confirmed") {
        if (clearPollRef.current) clearTimeout(clearPollRef.current);
        setState((prev) => ({
          ...prev,
          gameState: (msg.gameState as GameState) ?? prev.gameState,
          pendingPoll: null,
        }));
      } else if (type === "pocket_rejected") {
        if (clearPollRef.current) clearTimeout(clearPollRef.current);
        setState((prev) => ({
          ...prev,
          pendingPoll: prev.pendingPoll
            ? {
                ...prev.pendingPoll,
                rejected: true,
                rejections: msg.rejections as number,
              }
            : null,
        }));
        clearPollRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, pendingPoll: null }));
        }, 3000);
      }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (!cancelled) setState((prev) => ({ ...prev, status: "disconnected" }));
    };

    ws.onerror = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (!cancelled) {
        setState({ status: "error", players: [], gameState: null, pendingPoll: null, error: "Connection failed" });
      }
    };

    return () => {
      cancelled = true;
      if (pingRef.current) clearInterval(pingRef.current);
      if (clearPollRef.current) clearTimeout(clearPollRef.current);
      ws.close();
    };
  }, [roomId, username]);

  return { ...state, send };
}
