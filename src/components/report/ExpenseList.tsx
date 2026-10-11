"use client";

import { DEFAULT_CATEGORY_COLOR } from "@/lib/constants";
import { formatPHP } from "@/lib/money";
import { dayKey, type DayGroup, type ReportRow } from "@/lib/report";
import type { Category } from "@/types";

function dayLabel(group: DayGroup, now: Date): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (group.key === dayKey(now)) return "Today";
  if (group.key === dayKey(yesterday)) return "Yesterday";
  return group.date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Every logged expense, grouped by day with a subtotal per day. `onDelete` is
 * passed only for the open period — closed periods stay read-only so their
 * cutoff reconciliation can't shift after the fact (feature brief Q5).
 */
export function ExpenseList({
  groups,
  categoriesById,
  onDelete,
}: {
  groups: ReadonlyArray<DayGroup>;
  categoriesById: ReadonlyMap<string, Category>;
  onDelete?: (row: ReportRow) => void;
}) {
  const now = new Date();
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key} aria-label={dayLabel(group, now)}>
          <h3 className="flex items-baseline justify-between px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <span>{dayLabel(group, now)}</span>
            <span className="tabular-nums">{formatPHP(group.total)}</span>
          </h3>
          <ul className="mt-1 divide-y divide-line rounded-[14px] bg-surface px-4 shadow-sm">
            {group.rows.map((row) => {
              const category = categoriesById.get(row.categoryId);
              const color = category?.color ?? DEFAULT_CATEGORY_COLOR;
              return (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {category?.name ?? "Unknown"}
                    </span>
                    {row.note ? (
                      <span className="block truncate text-xs text-ink-muted">{row.note}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatPHP(row.amount)}
                  </span>
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      aria-label={`Delete ${formatPHP(row.amount)} ${category?.name ?? ""}`.trim()}
                      className="-mr-2 shrink-0 rounded-full px-2 py-1 text-lg leading-none text-ink-muted active:bg-danger-bg active:text-danger-fg"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
