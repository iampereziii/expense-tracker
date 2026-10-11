"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { sortByCreatedAt } from "@/lib/order";
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
    // Pending createdAt reads as the local time, so a just-added item sorts last
    // instead of landing in doc-id order (lib/order.ts sorts client-side).
    { serverTimestamps: "estimate" },
  );
  const accounts = useMemo(() => sortByCreatedAt(data), [data]);
  const totals = useMemo(() => sumBalances(data), [data]);
  return { accounts, totals, loading };
}
