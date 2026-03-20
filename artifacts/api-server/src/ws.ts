import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./lib/logger";

interface Player {
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

interface Room {
  id: string;
  players: Map<WebSocket, Player>;
  createdAt: number;
  gameState: GameState | null;
}

type ClientMessage =
  | { type: "join"; roomId: string; username: string }
  | { type: "leave"; roomId: string }
  | { type: "start_game"; roomId: string }
  | { type: "ball_result"; roomId: string; ball: number; result: "in" | "foul" }
  | { type: "ping" };

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(),
      createdAt: Date.now(),
      gameState: null,
    });
  }
  return rooms.get(roomId)!;
}

function getPlayersArray(room: Room): Player[] {
  return Array.from(room.players.values());
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getNextTargetBall(pocketedBalls: number[]): number {
  for (let i = 1; i <= 15; i++) {
    if (!pocketedBalls.includes(i)) return i;
  }
  return 0;
}

function broadcastAll(room: Room, payload: object) {
  const msg = JSON.stringify(payload);
  for (const [ws] of room.players) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function broadcast(room: Room, payload: object, exclude?: WebSocket) {
  const msg = JSON.stringify(payload);
  for (const [ws] of room.players) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function sendTo(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function removeClientFromRooms(ws: WebSocket) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(ws)) {
      const player = room.players.get(ws)!;
      room.players.delete(ws);

      broadcastAll(room, {
        type: "player_left",
        username: player.username,
        players: getPlayersArray(room),
        gameState: room.gameState,
      });

      logger.info({ roomId, username: player.username }, "Player left room");

      if (room.players.size === 0) {
        rooms.delete(roomId);
        logger.info({ roomId }, "Room deleted (empty)");
      }
      break;
    }
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    logger.info("WebSocket client connected");

    ws.on("message", (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        return;
      }

      if (msg.type === "ping") {
        sendTo(ws, { type: "pong" });
        return;
      }

      if (msg.type === "join") {
        const { roomId, username } = msg;
        removeClientFromRooms(ws);
        const room = getOrCreateRoom(roomId);
        room.players.set(ws, { username, joinedAt: Date.now() });

        sendTo(ws, {
          type: "joined",
          roomId,
          username,
          players: getPlayersArray(room),
          gameState: room.gameState,
        });

        broadcast(room, {
          type: "player_joined",
          username,
          players: getPlayersArray(room),
          gameState: room.gameState,
        }, ws);

        logger.info({ roomId, username }, "Player joined room");
      }

      if (msg.type === "leave") {
        removeClientFromRooms(ws);
      }

      if (msg.type === "start_game") {
        const { roomId } = msg;
        const room = rooms.get(roomId);
        if (!room || room.gameState?.started) return;

        const players = getPlayersArray(room);
        if (players.length < 1) return;

        const turnOrder = shuffle(players.map((p) => p.username));
        const scores: Record<string, number> = {};
        for (const p of turnOrder) scores[p] = 0;

        room.gameState = {
          started: true,
          turnOrder,
          currentPlayerIndex: 0,
          targetBall: 1,
          pocketedBalls: [],
          scores,
          finished: false,
        };

        broadcastAll(room, { type: "game_state", gameState: room.gameState });
        logger.info({ roomId }, "Game started");
      }

      if (msg.type === "ball_result") {
        const { roomId, ball, result } = msg;
        const room = rooms.get(roomId);
        if (!room?.gameState?.started || room.gameState.finished) return;

        const gs = room.gameState;

        if (!gs.pocketedBalls.includes(ball)) {
          gs.pocketedBalls = [...gs.pocketedBalls, ball];
        }

        const cp = gs.turnOrder[gs.currentPlayerIndex];
        if (result === "in") {
          gs.scores[cp] = (gs.scores[cp] ?? 0) + ball;
        } else {
          gs.scores[cp] = (gs.scores[cp] ?? 0) - ball;
        }

        gs.targetBall = getNextTargetBall(gs.pocketedBalls);

        if (gs.pocketedBalls.length >= 15) {
          gs.finished = true;
        }

        gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % gs.turnOrder.length;

        broadcastAll(room, { type: "game_state", gameState: gs });
        logger.info({ roomId, ball, result }, "Ball result recorded");
      }
    });

    ws.on("close", () => {
      removeClientFromRooms(ws);
      logger.info("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
      removeClientFromRooms(ws);
    });
  });

  logger.info("WebSocket server attached at /ws");
}
