import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./lib/logger";

interface Player {
  username: string;
  joinedAt: number;
}

interface Room {
  id: string;
  players: Map<WebSocket, Player>;
  createdAt: number;
}

type ClientMessage =
  | { type: "join"; roomId: string; username: string }
  | { type: "leave"; roomId: string }
  | { type: "ping" };

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      players: new Map(),
      createdAt: Date.now(),
    });
  }
  return rooms.get(roomId)!;
}

function getPlayersArray(room: Room): Player[] {
  return Array.from(room.players.values());
}

function broadcast(room: Room, payload: object, exclude?: WebSocket) {
  const msg = JSON.stringify(payload);
  for (const [ws] of room.players) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function sendTo(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function removeClientFromRooms(ws: WebSocket) {
  for (const [roomId, room] of rooms) {
    if (room.players.has(ws)) {
      const player = room.players.get(ws)!;
      room.players.delete(ws);

      broadcast(room, {
        type: "player_left",
        username: player.username,
        players: getPlayersArray(room),
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
        });

        broadcast(
          room,
          {
            type: "player_joined",
            username,
            players: getPlayersArray(room),
          },
          ws,
        );

        logger.info({ roomId, username }, "Player joined room");
      }

      if (msg.type === "leave") {
        removeClientFromRooms(ws);
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
