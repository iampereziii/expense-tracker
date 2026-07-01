"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { expensesQuery } from "@/services/expenses";
import type { Expense } from "@/types";

/**
 * Expenses for a period plus the client-computed total (Rule 10 — totals are
 * derived, never stored as a field that can drift).
 */
export function useExpenses(periodId: string | null): {
  expenses: Expense[];
  total: number;
  loading: boolean;
} {
  const { data, loading } = useQueryData<Expense>(
    () => (periodId ? expensesQuery(periodId) : null),
    [periodId],
  );
  const total = useMemo(() => data.reduce((sum, e) => sum + (e.amount || 0), 0), [data]);
  return { expenses: data, total, loading };
}
