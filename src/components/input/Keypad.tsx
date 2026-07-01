"use client";

/**
 * On-screen numeric keypad for one-handed entry. Mobile keyboards are slow and
 * cover the screen; a fixed keypad keeps the whole log loop in the thumb zone.
 */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "←"] as const;

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Amount keypad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          className="rounded-xl bg-slate-100 py-5 text-2xl font-semibold text-slate-800 active:bg-slate-300"
          aria-label={k === "←" ? "Delete" : k}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
