import type { ReactNode } from "react";

type Tone = "surface" | "sunken";

const TONE_CLASSES: Record<Tone, string> = {
  surface: "bg-surface",
  sunken: "bg-surface-sunken",
};

/** Tonal card — the 14px-radius surface every secondary-screen section sits on. */
export function Card({
  tone = "surface",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[14px] ${TONE_CLASSES[tone]} p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
