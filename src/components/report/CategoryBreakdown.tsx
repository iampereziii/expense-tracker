"use client";

import { DEFAULT_CATEGORY_COLOR } from "@/lib/constants";
import { formatPHP } from "@/lib/money";
import type { CategorySpend } from "@/lib/report";
import type { Category } from "@/types";

/**
 * Spend per category as plain CSS bars — no chart library (feature brief Q3:
 * bars are a share of the period total, so together they make 100%). Each row
 * doubles as the list filter: tap to narrow, tap again to clear.
 */
export function CategoryBreakdown({
  spend,
  categoriesById,
  selectedId,
  onSelect,
}: {
  spend: ReadonlyArray<CategorySpend>;
  categoriesById: ReadonlyMap<string, Category>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ul className="space-y-1" aria-label="Spend by category">
      {spend.map((c) => {
        const category = categoriesById.get(c.categoryId);
        const color = category?.color ?? DEFAULT_CATEGORY_COLOR;
        const selected = c.categoryId === selectedId;
        const percent = Math.round(c.share * 100);
        return (
          <li key={c.categoryId}>
            <button
              type="button"
              onClick={() => onSelect(selected ? null : c.categoryId)}
              aria-pressed={selected}
              className={`w-full rounded-xl px-2 py-2 text-left transition-colors motion-reduce:transition-none ${
                selected ? "bg-brand-soft" : "active:bg-surface-sunken"
              }`}
            >
              <span className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate font-medium">
                    {category?.name ?? "Unknown"}
                    {category?.archived ? (
                      <span className="font-normal text-ink-muted"> (archived)</span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatPHP(c.total)} <span className="text-ink-muted">· {percent}%</span>
                </span>
              </span>
              <span aria-hidden className="mt-1.5 block h-2 rounded-full bg-surface-sunken">
                <span
                  className="block h-2 rounded-full"
                  style={{ width: `${Math.max(c.share * 100, 1)}%`, backgroundColor: color }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
