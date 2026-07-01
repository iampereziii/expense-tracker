/** Seed categories created on first run so day one isn't empty (project-spec Gap #2). */
export const SEED_CATEGORIES: ReadonlyArray<{ name: string; color: string }> = [
  { name: "Food", color: "#f59e0b" },
  { name: "Bills", color: "#3b82f6" },
];

/** Default chip color when the user hasn't picked one. */
export const DEFAULT_CATEGORY_COLOR = "#64748b";
