/**
 * Curated category swatches.
 *
 * Constrained now, while there is still no colour picker, because it is free
 * today and expensive later (challenge finding #13). Every entry is verified in
 * `tests/unit/contrast.test.ts` to clear 4.5:1 against the foreground
 * `readableTextOn` derives for it — so a chip is readable whichever swatch a
 * category ends up with. Add to this list only with a passing test.
 */
export const CATEGORY_SWATCHES: ReadonlyArray<string> = [
  "#b45309", // amber-700
  "#f59e0b", // amber-500
  "#1d4ed8", // blue-700
  "#3b82f6", // blue-500
  "#15803d", // brand green
  "#0f766e", // teal-700
  "#7e22ce", // purple-700
  "#be123c", // rose-700
  "#475569", // slate-600
];

/** Seed categories created on first run so day one isn't empty (project-spec Gap #2). */
export const SEED_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: "Food", color: "#f59e0b" },
  { name: "Bills", color: "#3b82f6" },
];

/** Default chip color when the user hasn't picked one. */
export const DEFAULT_CATEGORY_COLOR = "#475569";
