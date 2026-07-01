"use client";

import { useQueryData } from "./useQueryData";
import { activeCategoriesQuery } from "@/services/categories";
import type { Category } from "@/types";

/** Active (non-archived) categories for the input chip row. */
export function useCategories(enabled: boolean): { categories: Category[]; loading: boolean } {
  const { data, loading } = useQueryData<Category>(
    () => (enabled ? activeCategoriesQuery() : null),
    [enabled],
  );
  return { categories: data, loading };
}
