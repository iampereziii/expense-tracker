"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { activeAccountsQuery } from "@/services/accounts";
import { sumBalances, type BalanceTotals } from "@/lib/awareness";
import type { Account } from "@/types";

/** Live account balances plus the household's current savings totals. */
export function useAccounts(enabled: boolean): {
  accounts: Account[];
  totals: BalanceTotals;
  loading: boolean;
} {
  const { data, loading } = useQueryData<Account>(
    () => (enabled ? activeAccountsQuery() : null),
    [enabled],
  );
  const totals = useMemo(() => sumBalances(data), [data]);
  return { accounts: data, totals, loading };
}
