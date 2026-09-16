"use client";

import { useEffect, useState } from "react";
import { playSound } from "@/lib/sounds";

export default function Countdown({ until }: { until: number }) {
  const [remaining, setRemaining] = useState(() => Math.ceil((until - Date.now()) / 1000));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(1, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [until]);

  useEffect(() => {
    playSound("tick");
  }, [remaining]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xl">
      <div
        key={remaining}
        className="animate-pop-in flex h-40 w-40 items-center justify-center rounded-full bg-white text-7xl font-bold text-[var(--accent)] shadow-2xl"
      >
        {remaining}
      </div>
    </div>
  );
}
