import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PendingPoll } from "@/lib/useRoom";

const BALL_COLORS: Record<number, string> = {
  1: "#F9C231", 2: "#2B5BA8", 3: "#CC2222", 4: "#7B2FBE",
  5: "#F08000", 6: "#1E8449", 7: "#8B1111", 8: "#111827",
};

function getBallColor(n: number) {
  return BALL_COLORS[n >= 9 ? n - 8 : n] ?? "#888";
}

function MiniPoolBall({ n }: { n: number }) {
  const isStripe = n >= 9;
  const color = getBallColor(n);
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      backgroundColor: isStripe ? "white" : color,
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.4)", flexShrink: 0,
    }}>
      {isStripe && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "28%", bottom: "28%", backgroundColor: color }} />
      )}
      <div style={{
        position: "relative", zIndex: 1,
        width: 18, height: 18, borderRadius: "50%",
        backgroundColor: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 9, fontWeight: "bold", color: n === 8 ? "#111" : color, lineHeight: 1 }}>{n}</span>
      </div>
    </div>
  );
}

interface Props {
  poll: PendingPoll;
  isActor: boolean;
  hasRejected: boolean;
  onReject: () => void;
}

export function RejectionBanner({ poll, isActor, hasRejected, onReject }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.ceil((poll.expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const tick = setInterval(() => {
      const s = Math.max(0, Math.ceil((poll.expiresAt - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 0) clearInterval(tick);
    }, 500);
    return () => clearInterval(tick);
  }, [poll.expiresAt]);

  if (poll.rejected) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 bg-red-950 border-t border-red-800 flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <div>
          <p className="text-white font-bold">Pocket rejected!</p>
          <p className="text-red-300 text-sm">
            {poll.rejections ?? 0} player{(poll.rejections ?? 0) !== 1 ? "s" : ""} rejected.{" "}
            {isActor ? "Pick again." : `${poll.actor} must pick again.`}
          </p>
        </div>
      </div>
    );
  }

  if (isActor) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 bg-gray-900 border-t border-gray-700">
        <div className="flex items-center gap-3">
          <MiniPoolBall n={poll.ball} />
          <div className="flex-1">
            <p className="text-white font-semibold">
              Ball {poll.ball} — <span className={poll.result === "in" ? "text-green-400" : "text-red-400"}>
                {poll.result.toUpperCase()}
              </span>
            </p>
            <p className="text-gray-400 text-sm">Waiting for others to confirm… {secondsLeft}s</p>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-yellow-500 flex items-center justify-center">
            <span className="text-yellow-400 text-xs font-bold">{secondsLeft}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 bg-gray-900 border-t border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <MiniPoolBall n={poll.ball} />
        <div className="flex-1">
          <p className="text-white font-semibold">
            <span className="text-gray-300">{poll.actor}</span> pocketed Ball {poll.ball}
          </p>
          <p className="text-sm">
            <span className={`font-bold ${poll.result === "in" ? "text-green-400" : "text-red-400"}`}>
              {poll.result.toUpperCase()}
            </span>
            <span className="text-gray-500 ml-2">{secondsLeft}s to respond</span>
          </p>
        </div>
      </div>
      {hasRejected ? (
        <div className="w-full py-2 text-center text-gray-400 text-sm bg-gray-800 rounded-xl">
          You rejected this pocket ✓
        </div>
      ) : (
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
          onClick={onReject}
        >
          Reject ({secondsLeft}s)
        </Button>
      )}
    </div>
  );
}
