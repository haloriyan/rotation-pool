import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { GameState } from "@/lib/useRoom";

const BALL_COLORS: Record<number, string> = {
  1: "#F9C231",
  2: "#2B5BA8",
  3: "#CC2222",
  4: "#7B2FBE",
  5: "#F08000",
  6: "#1E8449",
  7: "#8B1111",
  8: "#111827",
};

function getBallColor(n: number): string {
  const base = n >= 9 ? n - 8 : n;
  return BALL_COLORS[base] ?? "#888";
}

function PoolBall({
  number,
  size = 64,
  dimmed = false,
  selected = false,
  isTarget = false,
}: {
  number: number;
  size?: number;
  dimmed?: boolean;
  selected?: boolean;
  isTarget?: boolean;
}) {
  const isStripe = number >= 9;
  const color = getBallColor(number);
  const fontSize = size * 0.26;
  const badgeSize = size * 0.46;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: isStripe ? "white" : color,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: dimmed ? 0.6 : 1,
        boxShadow: selected
          ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 4px 12px rgba(0,0,0,0.5)`
          : isTarget
            ? `0 0 0 3px ${color}, 0 4px 16px rgba(0,0,0,0.6)`
            : "0 2px 6px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)",
        flexShrink: 0,
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: selected ? "scale(1.08)" : "scale(1)",
      }}
    >
      {isStripe && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "28%",
            bottom: "28%",
            backgroundColor: color,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: badgeSize,
          height: badgeSize,
          borderRadius: "50%",
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: "bold",
            color: number === 8 ? "#111827" : color,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {number}
        </span>
      </div>
    </div>
  );
}

interface BallPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  onResult: (ball: number, result: "in" | "foul") => void;
}

export function BallPicker({ open, onOpenChange, gameState, onResult }: BallPickerProps) {
  const [selectedBall, setSelectedBall] = useState<number | null>(null);
  const { targetBall, pocketedBalls } = gameState;

  const ALL_BALLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  function handleBallClick(n: number) {
    if (pocketedBalls.includes(n)) return;
    setSelectedBall((prev) => (prev === n ? null : n));
  }

  function handleResult(result: "in" | "foul") {
    if (!selectedBall) return;
    onResult(selectedBall, result);
    setSelectedBall(null);
    onOpenChange(false);
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedBall(null); }}>
      <DrawerContent className="bg-gray-950 border-t border-gray-800 max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-white text-lg">Your Turn — Pick a Ball</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          {/* Target ball featured */}
          <div className="flex flex-col items-center gap-2 mb-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Target</p>
            <button
              onClick={() => handleBallClick(targetBall)}
              className="active:scale-95 transition-transform"
              disabled={pocketedBalls.includes(targetBall)}
            >
              <PoolBall
                number={targetBall}
                size={88}
                isTarget
                selected={selectedBall === targetBall}
                dimmed={pocketedBalls.includes(targetBall)}
              />
            </button>
            <p className="text-xs text-gray-400">Ball {targetBall}</p>
          </div>

          <div className="border-t border-gray-800 mb-4" />

          {/* IN / FOUL confirmation — above the grid once a ball is selected */}
          {selectedBall !== null && (
            <div className="mb-4 p-4 bg-gray-900 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <PoolBall number={selectedBall} size={40} />
                <div>
                  <p className="text-white font-semibold">Ball {selectedBall}</p>
                  {selectedBall !== targetBall && (
                    <p className="text-xs text-yellow-400">Not the target ball</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={() => handleResult("in")}
                >
                  IN ✓
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={() => handleResult("foul")}
                >
                  FOUL ✗
                </Button>
              </div>
            </div>
          )}

          {/* 4-column ball grid */}
          <div className="grid grid-cols-4 gap-3 justify-items-center">
            {ALL_BALLS.map((n) => {
              const pocketed = pocketedBalls.includes(n);
              return (
                <button
                  key={n}
                  onClick={() => handleBallClick(n)}
                  disabled={pocketed}
                  className="active:scale-95 transition-transform disabled:cursor-not-allowed"
                >
                  <PoolBall
                    number={n}
                    size={64}
                    dimmed={pocketed}
                    selected={selectedBall === n}
                  />
                </button>
              );
            })}
            {/* 16th empty tile to complete 4x4 */}
            <div className="w-16 h-16" />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
