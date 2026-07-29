"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { periodBalancesQuery } from "@/services/balances";
import { sumBalances, type BalanceTotals } from "@/lib/awareness";
import type { BalanceSnapshot } from "@/types";

/** The balances frozen when `periodId` was declared. Empty for legacy periods. */
export function usePeriodBalances(periodId: string | null): {
  snapshots: BalanceSnapshot[];
  totals: BalanceTotals;
  loading: boolean;
} {
  const { data, loading } = useQueryData<BalanceSnapshot>(
    () => (periodId ? periodBalancesQuery(periodId) : null),
    [periodId],
  );
  const totals = useMemo(() => sumBalances(data), [data]);
  return { snapshots: data, totals, loading };
}
