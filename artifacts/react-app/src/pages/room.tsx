import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Share2, Check } from "lucide-react";
import { useRoom } from "@/lib/useRoom";
import { BallPicker } from "@/components/BallPicker";
import { Button } from "@/components/ui/button";

const BALL_COLORS: Record<number, string> = {
  1: "#F9C231", 2: "#2B5BA8", 3: "#CC2222", 4: "#7B2FBE",
  5: "#F08000", 6: "#1E8449", 7: "#8B1111", 8: "#111827",
};

function getBallColor(n: number): string {
  const base = n >= 9 ? n - 8 : n;
  return BALL_COLORS[base] ?? "#888";
}

function Miniball({ n }: { n: number }) {
  const isStripe = n >= 9;
  const color = getBallColor(n);
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        backgroundColor: isStripe ? "white" : color,
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        flexShrink: 0,
      }}
    >
      {isStripe && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "28%", bottom: "28%", backgroundColor: color }} />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 6, fontWeight: "bold", color: n === 8 ? "#111" : color, lineHeight: 1 }}>{n}</span>
      </div>
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const username = searchParams.get("username") ?? "";
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { status, players, gameState, send } = useRoom(roomId ?? null, username);

  const isMyTurn =
    gameState?.started &&
    !gameState.finished &&
    gameState.turnOrder[gameState.currentPlayerIndex] === username;

  const currentPlayer = gameState
    ? gameState.turnOrder[gameState.currentPlayerIndex]
    : null;

  function handleLeave() {
    navigate("/");
  }

  async function handleShare() {
    const joinUrl = `${window.location.origin}/join/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Rotation Pool room", url: joinUrl });
        return;
      } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStartGame() {
    send({ type: "start_game", roomId });
  }

  function handleBallResult(ball: number, result: "in" | "foul") {
    send({ type: "ball_result", roomId, ball, result });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start px-4 pt-10 gap-6">
      {/* Header */}
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
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
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

      {/* Game state: not started */}
      {!gameState?.started && status === "connected" && (
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Players</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              status === "connected" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"
            }`}>
              {status === "connected" ? "Connected" : "Connecting…"}
            </span>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {players.map((p) => (
              <div key={p.username} className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm uppercase">
                  {p.username.charAt(0)}
                </div>
                <span className="text-white font-medium flex-1">{p.username}</span>
                {p.username === username && <span className="text-xs text-green-400 font-medium">You</span>}
              </div>
            ))}
            {players.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Waiting for players…</p>
            )}
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            onClick={handleStartGame}
            disabled={players.length < 1}
          >
            Start Game
          </Button>
        </div>
      )}

      {/* Game in progress */}
      {gameState?.started && !gameState.finished && (
        <div className="w-full max-w-md flex flex-col gap-4">
          {/* Current turn banner */}
          <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${
            isMyTurn
              ? "bg-green-950 border-green-700"
              : "bg-gray-900 border-gray-800"
          }`}>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">
                {isMyTurn ? "Your Turn" : "Current Turn"}
              </p>
              <p className="text-white font-bold">{isMyTurn ? "You" : currentPlayer}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">Target:</span>
              <Miniball n={gameState.targetBall} />
              <span className="text-xs text-gray-300 font-mono">#{gameState.targetBall}</span>
            </div>
          </div>

          {/* Pick ball button (when it's my turn) */}
          {isMyTurn && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={() => setPickerOpen(true)}
            >
              Pick a Ball
            </Button>
          )}

          {/* Scores */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Scores</h2>
            <div className="flex flex-col gap-2">
              {gameState.turnOrder.map((player, i) => {
                const isCurrent = gameState.currentPlayerIndex === i;
                return (
                  <div
                    key={player}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                      isCurrent
                        ? "bg-gray-800 border-gray-600"
                        : "bg-gray-900 border-gray-800"
                    }`}
                  >
                    <span className="text-gray-500 text-sm w-5 text-center font-mono">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm uppercase">
                      {player.charAt(0)}
                    </div>
                    <span className="text-white font-medium flex-1">{player}</span>
                    {player === username && <span className="text-xs text-green-400 mr-2">You</span>}
                    {isCurrent && <span className="text-xs text-yellow-400 mr-2">▶</span>}
                    <span className="text-white font-bold font-mono text-lg">
                      {gameState.scores[player] ?? 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pocketed balls */}
          {gameState.pocketedBalls.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Pocketed</h2>
              <div className="flex flex-wrap gap-2">
                {[...gameState.pocketedBalls].sort((a, b) => a - b).map((n) => (
                  <Miniball key={n} n={n} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game finished */}
      {gameState?.finished && (
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="text-center">
            <p className="text-3xl mb-1">🏆</p>
            <h2 className="text-xl font-bold text-white">Game Over</h2>
          </div>
          <div className="flex flex-col gap-2">
            {[...gameState.turnOrder]
              .sort((a, b) => (gameState.scores[b] ?? 0) - (gameState.scores[a] ?? 0))
              .map((player, i) => (
                <div key={player} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                  i === 0 ? "bg-yellow-950 border-yellow-700" : "bg-gray-900 border-gray-800"
                }`}>
                  <span className="text-gray-400 font-bold w-5 text-center">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm uppercase">
                    {player.charAt(0)}
                  </div>
                  <span className="text-white font-medium flex-1">{player}</span>
                  {i === 0 && <span className="text-yellow-400 text-sm">👑</span>}
                  <span className="text-white font-bold font-mono text-lg">{gameState.scores[player] ?? 0}</span>
                </div>
              ))}
          </div>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            onClick={handleStartGame}
          >
            Play Again
          </Button>
        </div>
      )}

      {/* Connecting state */}
      {status !== "connected" && !gameState?.started && (
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-900 text-yellow-300">
              {status === "connecting" ? "Connecting…" : status === "error" ? "Error" : "Disconnected"}
            </span>
          </div>
        </div>
      )}

      {/* Ball picker drawer */}
      {gameState?.started && !gameState.finished && (
        <BallPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          gameState={gameState}
          onResult={handleBallResult}
        />
      )}
    </div>
  );
}
