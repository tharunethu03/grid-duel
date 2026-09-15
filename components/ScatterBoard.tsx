"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Spot {
  value: number;
  x: number; // px, center
  y: number; // px, center
  rotate: number;
}

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h;
}

function layout(board: number[], width: number, height: number) {
  const n = Math.max(1, board.length);
  const rand = seededRandom(hashString(board.join(",")) || 1);

  const padX = width * 0.05;
  const padY = height * 0.05;
  const usableW = Math.max(1, width - padX * 2);
  const usableH = Math.max(1, height - padY * 2);

  // average area available per number, used to size tiles and target spacing
  const spacing = Math.sqrt((usableW * usableH) / n);
  const tileSize = Math.max(14, Math.min(44, spacing * 0.5));
  const fontSize = Math.max(11, Math.min(22, tileSize * 0.55));
  const floorDist = tileSize + 10; // absolute minimum center-to-center distance

  const placed: { x: number; y: number }[] = [];
  let minDist = Math.max(floorDist, spacing * 1.1);

  const spots: Spot[] = board.map((value) => {
    let x = padX + usableW / 2;
    let y = padY + usableH / 2;
    let found = false;
    let shrinkSteps = 0;

    while (!found && shrinkSteps < 30) {
      for (let attempt = 0; attempt < 40; attempt++) {
        const cx = padX + rand() * usableW;
        const cy = padY + rand() * usableH;
        const ok = placed.every(
          (p) => Math.hypot(p.x - cx, p.y - cy) >= minDist
        );
        if (ok) {
          x = cx;
          y = cy;
          found = true;
          break;
        }
      }
      if (!found) {
        minDist = Math.max(floorDist, minDist * 0.88);
        shrinkSteps++;
      }
    }

    placed.push({ x, y });
    const rotate = rand() * 44 - 22;
    return { value, x, y, rotate };
  });

  return { spots, tileSize, fontSize };
}

export default function ScatterBoard({
  board,
  onTileClick,
  disabled,
  wrongValue,
}: {
  board: number[];
  onTileClick?: (value: number) => void;
  disabled?: boolean;
  wrongValue?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const boardKey = board.join(",");
  const height = Math.max(380, Math.min(760, board.length * 13 + 300));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { spots, tileSize, fontSize } = useMemo(
    () => layout(board, width || 320, height),
    [boardKey, width, height]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-lg mx-auto card overflow-y-auto"
      style={{ height }}
    >
      {width > 0 &&
        spots.map((spot) => (
          <button
            key={spot.value}
            disabled={disabled}
            onClick={() => onTileClick?.(spot.value)}
            style={{
              left: spot.x,
              top: spot.y,
              width: tileSize,
              height: tileSize,
              fontSize,
              transform: `translate(-50%, -50%) rotate(${spot.rotate}deg)`,
            }}
            className={`absolute flex items-center justify-center font-semibold text-[var(--foreground)]
              transition-transform hover:scale-125 hover:z-10 hover:text-[var(--accent)] active:scale-90 disabled:hover:scale-100
              ${wrongValue === spot.value ? "animate-shake text-[var(--danger)]" : ""}`}
          >
            {spot.value}
          </button>
        ))}
    </div>
  );
}
