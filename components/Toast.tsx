"use client";

import { useEffect } from "react";

export default function Toast({
  message,
  onDismiss,
  tone = "danger",
}: {
  message: string | null;
  onDismiss: () => void;
  tone?: "danger" | "info";
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] flex justify-center px-4 pt-4 pointer-events-none">
      <div
        role="alert"
        onClick={onDismiss}
        className={`animate-toast-in pointer-events-auto w-full max-w-md cursor-pointer rounded-2xl px-4 py-3 text-sm font-medium text-white text-center shadow-lg ${
          tone === "danger" ? "bg-[var(--danger)]" : "bg-[var(--accent)]"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
