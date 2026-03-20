import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Share2, Check } from "lucide-react";
import { useRoom } from "@/lib/useRoom";
import { Button } from "@/components/ui/button";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const username = searchParams.get("username") ?? "";
  const [copied, setCopied] = useState(false);

  const { status, players, error } = useRoom(roomId ?? null, username);

  function handleLeave() {
    navigate("/");
  }

  async function handleShare() {
    const joinUrl = `${window.location.origin}/join/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Rotation Pool room", url: joinUrl });
        return;
      } catch {
        // cancelled or not supported, fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start px-4 pt-10 gap-8">
      <div className="w-full max-w-md flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🎱 Room</h1>
          <p className="text-xs text-gray-500 font-mono mt-0.5 break-all">{roomId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 h-8 w-8"
            onClick={handleShare}
            title="Share room link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={handleLeave}
          >
            Leave
          </Button>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Players
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status === "connected"
                ? "bg-green-900 text-green-300"
                : status === "connecting"
                  ? "bg-yellow-900 text-yellow-300"
                  : "bg-red-900 text-red-300"
            }`}
          >
            {status === "connected"
              ? "Connected"
              : status === "connecting"
                ? "Connecting…"
                : status === "error"
                  ? "Error"
                  : "Disconnected"}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-3">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          {players.length === 0 && status === "connected" && (
            <p className="text-gray-500 text-sm text-center py-6">
              Waiting for players…
            </p>
          )}
          {players.map((player, i) => (
            <div
              key={player.username}
              className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3 border border-gray-800"
            >
              <span className="text-gray-500 text-sm w-5 text-center font-mono">
                {i + 1}
              </span>
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm uppercase">
                {player.username.charAt(0)}
              </div>
              <span className="text-white font-medium flex-1">{player.username}</span>
              {player.username === username && (
                <span className="text-xs text-green-400 font-medium">You</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
