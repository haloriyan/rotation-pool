import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateRoom() {
  const navigate = useNavigate();
  const [roomId] = useState(() => uuidv4());
  const [username, setUsername] = useState("");

  const joinUrl = `${window.location.origin}/join/${roomId}`;

  function handleEnterRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    navigate(`/room/${roomId}?username=${encodeURIComponent(username.trim())}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Room Created</h1>
        <p className="mt-1 text-gray-400 text-sm">
          Scan with any camera app or share the link to invite players
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="bg-white p-4 rounded-2xl shadow-lg">
          <QRCodeSVG value={joinUrl} size={220} />
        </div>
      </div>

      <form onSubmit={handleEnterRoom} className="w-full max-w-xs flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username" className="text-gray-300 text-sm">
            Your username
          </Label>
          <Input
            id="username"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            maxLength={20}
            autoFocus
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          disabled={!username.trim()}
        >
          Enter Room
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-gray-500 hover:text-gray-300"
          onClick={() => navigate("/")}
        >
          Back
        </Button>
      </form>
    </div>
  );
}
