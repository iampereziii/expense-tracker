"use client";

import type { Period } from "@/types";

function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "Oct 1 – now" for the open period, "Sep 15 – Oct 1" for a closed one. */
export function periodLabel(period: Period): string {
  const start = period.startDate?.toDate();
  const startText = start ? shortDate(start) : "Syncing…";
  const end = period.endDate?.toDate();
  return `${startText} – ${end ? shortDate(end) : "now"}`;
}

export function PeriodPicker({
  periods,
  selectedId,
  onSelect,
}: {
  periods: ReadonlyArray<Period>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <select
      aria-label="Budget period"
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      className="w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none"
    >
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {periodLabel(p)}
          {p.endDate ? "" : " (current)"}
        </option>
      ))}
    </select>
  );
}
