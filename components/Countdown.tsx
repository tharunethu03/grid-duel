"use client";

import { useEffect, useState } from "react";

export default function Countdown() {
  const [count, setCount] = useState(3);

  useEffect(() => {
    setCount(3);
    const interval = setInterval(() => {
      setCount((c) => (c > 1 ? c - 1 : c));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        key={count}
        className="animate-pop-in flex h-40 w-40 items-center justify-center rounded-full bg-white text-7xl font-bold text-[var(--accent)] shadow-2xl"
      >
        {count}
      </div>
    </div>
  );
}
