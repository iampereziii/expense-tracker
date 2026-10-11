"use client";

import { useQueryData } from "./useQueryData";
import { allCategoriesQuery } from "@/services/categories";
import type { Category } from "@/types";

/** Every category, archived included — for reports, not the input chip row (Rule 7). */
export function useAllCategories(enabled: boolean): { categories: Category[]; loading: boolean } {
  const { data, loading } = useQueryData<Category>(
    () => (enabled ? allCategoriesQuery() : null),
    [enabled],
  );
  return { categories: data, loading };
}
