import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          🎱 Rotation Pool
        </h1>
        <p className="mt-2 text-gray-400 text-sm">
          Create or join a room to start playing
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          onClick={() => navigate("/create")}
        >
          Create a Room
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full border-gray-600 text-white hover:bg-gray-800 font-semibold"
          onClick={() => navigate("/join")}
        >
          Join a Room
        </Button>
      </div>
    </div>
  );
}
