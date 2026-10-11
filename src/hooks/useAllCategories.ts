"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { sortByCreatedAt } from "@/lib/order";
import { allCategoriesQuery } from "@/services/categories";
import type { Category } from "@/types";

/** Every category, archived included — for reports, not the input chip row (Rule 7). */
export function useAllCategories(enabled: boolean): { categories: Category[]; loading: boolean } {
  const { data, loading } = useQueryData<Category>(
    () => (enabled ? allCategoriesQuery() : null),
    [enabled],
    // Same as useCategories: pending createdAt reads as local time so sorting is stable.
    { serverTimestamps: "estimate" },
  );
  const categories = useMemo(() => sortByCreatedAt(data), [data]);
  return { categories, loading };
}
