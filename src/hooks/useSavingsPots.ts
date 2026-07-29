"use client";

import { useMemo } from "react";
import { useQueryData } from "./useQueryData";
import { activePotsQuery, allocationsQuery } from "@/services/savings";
import { potBalances, sumPotBalances } from "@/lib/savings";
import type { Allocation, SavingsPot } from "@/types";

/**
 * Pots plus their ledger-derived balances (Rule 10 — totals are computed, never stored
 * on the pot where they could drift from the entries that produced them).
 */
export function useSavingsPots(enabled: boolean): {
  pots: SavingsPot[];
  allocations: Allocation[];
  balances: Record<string, number>;
  potTotal: number;
  loading: boolean;
} {
  const { data: pots, loading: potsLoading } = useQueryData<SavingsPot>(
    () => (enabled ? activePotsQuery() : null),
    [enabled],
  );
  const { data: allocations, loading: ledgerLoading } = useQueryData<Allocation>(
    () => (enabled ? allocationsQuery() : null),
    [enabled],
  );

  const balances = useMemo(() => potBalances(allocations), [allocations]);
  // Archived pots keep their entries, so sum the visible pots rather than the whole
  // ledger — otherwise savings main would stay reduced by a pot that's no longer shown.
  const potTotal = useMemo(() => {
    const visible: Record<string, number> = {};
    for (const pot of pots) visible[pot.id] = balances[pot.id] ?? 0;
    return sumPotBalances(visible);
  }, [pots, balances]);

  return {
    pots,
    allocations,
    balances,
    potTotal,
    loading: potsLoading || ledgerLoading,
  };
}
