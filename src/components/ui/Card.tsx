import type { ReactNode } from "react";

/** Tonal card — the 14px-radius surface every secondary-screen section sits on. */
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[14px] bg-surface p-4 shadow-sm ${className}`}>{children}</div>
  );
}
