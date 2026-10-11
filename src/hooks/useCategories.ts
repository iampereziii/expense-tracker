"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { sortByCreatedAt } from "@/lib/order";
import { activeCategoriesQuery } from "@/services/categories";
import type { Category } from "@/types";

/** Active (non-archived) categories for the input chip row. */
export function useCategories(enabled: boolean): { categories: Category[]; loading: boolean } {
  const { data, loading } = useQueryData<Category>(
    () => (enabled ? activeCategoriesQuery() : null),
    [enabled],
    // Pending createdAt reads as the local time, so a just-added item sorts last
    // instead of landing in doc-id order (lib/order.ts sorts client-side).
    { serverTimestamps: "estimate" },
  );
  const categories = useMemo(() => sortByCreatedAt(data), [data]);
  return { categories, loading };
}
