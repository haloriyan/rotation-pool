import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function extractRoomId(raw: string): string | null {
  const match = raw.match(UUID_REGEX);
  return match ? match[0] : null;
}

export default function JoinRoom() {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState(paramRoomId ?? "");
  const [username, setUsername] = useState("");
  const [scanning, setScanning] = useState(!paramRoomId);
  const [scanError, setScanError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!scanning) return;

    const scannerId = "qr-reader";
    const html5QrCode = new Html5Qrcode(scannerId);

    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const id = extractRoomId(decodedText);
          if (id) {
            html5QrCode.stop().catch(() => {});
            if (mountedRef.current) {
              setRoomId(id);
              setScanning(false);
            }
          }
        },
        () => {},
      )
      .catch((err) => {
        if (mountedRef.current) {
          setScanError("Camera access denied. Please enter the Room ID manually.");
          setScanning(false);
        }
        console.error(err);
      });

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, [scanning]);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    navigate(`/room/${roomId.trim()}?username=${encodeURIComponent(username.trim())}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Join a Room</h1>
        <p className="mt-1 text-gray-400 text-sm">
          {scanning ? "Point your camera at the room QR code" : "Enter your username to join"}
        </p>
      </div>

      {scanning && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          <div
            id="qr-reader"
            className="w-full rounded-xl overflow-hidden"
            style={{ maxWidth: 320 }}
          />
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={() => setScanning(false)}
          >
            Enter Room ID manually
          </Button>
        </div>
      )}

      {!scanning && (
        <form onSubmit={handleJoin} className="w-full max-w-xs flex flex-col gap-3">
          {scanError && (
            <p className="text-sm text-yellow-400 text-center">{scanError}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roomId" className="text-gray-300 text-sm">
              Room ID
            </Label>
            <Input
              id="roomId"
              placeholder="Paste or type Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 font-mono text-sm"
            />
          </div>
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
            disabled={!roomId.trim() || !username.trim()}
          >
            Join Room
          </Button>
          {!paramRoomId && (
            <Button
              type="button"
              variant="ghost"
              className="text-gray-500 hover:text-gray-300"
              onClick={() => { setScanError(""); setScanning(true); }}
            >
              Scan QR code instead
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-gray-500 hover:text-gray-300"
            onClick={() => navigate("/")}
          >
            Back
          </Button>
        </form>
      )}
    </div>
  );
}
