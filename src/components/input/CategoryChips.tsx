"use client";

import type { Category } from "@/types";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/constants";
import { readableTextOn } from "@/lib/contrast";

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
    return <p className="text-sm text-ink-muted">No categories yet — add one in Categories.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
      {categories.map((c) => {
        const selected = c.id === selectedId;
        // Category colours come from Firestore, so the label colour is derived
        // per-chip rather than assumed white — see lib/contrast.ts. This is the
        // data-driven exception the token-only styling rule carves out.
        const background = c.color ?? DEFAULT_CATEGORY_COLOR;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-pressed={selected}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
              selected ? "" : "bg-surface-sunken text-ink"
            }`}
            style={
              selected
                ? { backgroundColor: background, color: readableTextOn(background) }
                : undefined
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
