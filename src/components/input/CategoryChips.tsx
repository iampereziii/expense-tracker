"use client";

import type { Category } from "@/types";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/constants";

/** Tap-target chips (not a dropdown) so picking a category is a single thumb tap. */
export function CategoryChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-slate-400">No categories yet — add one in Categories.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={selected}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selected ? "text-white" : "text-slate-700"
            }`}
            style={{
              backgroundColor: selected ? (c.color ?? DEFAULT_CATEGORY_COLOR) : "#f1f5f9",
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
