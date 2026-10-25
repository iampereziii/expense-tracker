"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { expensesQuery } from "@/services/expenses";
import { carryChain, carryOut, effectiveBudget, type EffectiveBudget } from "@/lib/budget";
import type { Expense, Period } from "@/types";

/**
 * Live spending totals for a set of periods, keyed by period id. One listener per id,
 * all served from the persistent cache offline — so a late-synced expense in any of
 * them updates the total the moment it lands.
 */
export function useSpentByPeriod(ids: ReadonlyArray<string>): ReadonlyMap<string, number> {
  const key = ids.join(",");
  const [spent, setSpent] = useState<ReadonlyMap<string, number>>(new Map());

  useEffect(() => {
    if (!key) {
      setSpent(new Map());
      return;
    }
    const unsubs = key.split(",").map((id) =>
      onSnapshot(
        expensesQuery(id),
        (snap) => {
          const total = snap.docs.reduce(
            (sum, d) => sum + ((d.data() as Partial<Expense>).amount || 0),
            0,
          );
          setSpent((prev) => new Map(prev).set(id, total));
        },
        (error) => console.error("Firestore listener stopped:", error),
      ),
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, [key]);

  return spent;
}

/**
 * What a period actually has to spend, carry-over included (lib/budget.ts). Subscribes
 * only to the earlier periods the carry depends on — none for a period that doesn't
 * carry over. Its own spending isn't needed; callers already have it.
 */
export function useEffectiveBudget(
  periods: ReadonlyArray<Period>,
  periodId: string | null,
): EffectiveBudget {
  const chain = useMemo(
    () => (periodId ? carryChain(periods, periodId) : []),
    [periods, periodId],
  );
  const spent = useSpentByPeriod(chain);
  return useMemo(
    () =>
      periodId
        ? effectiveBudget(periods, periodId, spent)
        : { base: 0, carried: 0, total: 0 },
    [periods, periodId, spent],
  );
}

/**
 * What the given period would hand to a new period declared now — the preview on the
 * declare form. Needs that period's own spending plus its chain.
 */
export function useCarryOut(periods: ReadonlyArray<Period>, periodId: string | null): number {
  const ids = useMemo(
    () => (periodId ? [periodId, ...carryChain(periods, periodId)] : []),
    [periods, periodId],
  );
  const spent = useSpentByPeriod(ids);
  return useMemo(
    () => (periodId ? carryOut(periods, periodId, spent) : 0),
    [periods, periodId, spent],
  );
}
