"use client";

import { usePeriodBalances } from "@/hooks/usePeriodBalances";
import { useExpenses } from "@/hooks/useExpenses";
import { computeAwareness, describeGap } from "@/lib/awareness";
import { formatPHP } from "@/lib/money";
import type { Period } from "@/types";

interface AwarenessCardProps {
  /** The period being reconciled — its opening balances are the "previous" side. */
  closedPeriod: Period;
  /** The period declared right after it, whose snapshot closes the cutoff. */
  nextPeriodId: string;
}

/** Signed money, e.g. "+₱12,000.00" — reads as movement rather than a bare total. */
function signed(amount: number): string {
  return `${amount > 0 ? "+" : ""}${formatPHP(amount)}`;
}

/**
 * Period-over-period awareness for the just-closed cutoff: what came in, what was
 * logged, what actually got saved, and what the numbers can't explain.
 *
 * Renders nothing for legacy periods — those pre-date balance snapshots, and an
 * awareness card built on a missing "previous" would just invent a gap.
 */
export function AwarenessCard({ closedPeriod, nextPeriodId }: AwarenessCardProps) {
  const { snapshots: previousSnaps, totals: previous } = usePeriodBalances(closedPeriod.id);
  const { snapshots: currentSnaps, totals: current } = usePeriodBalances(nextPeriodId);
  const { total: loggedExpenses } = useExpenses(closedPeriod.id);

  if (previousSnaps.length === 0 || currentSnaps.length === 0) return null;

  const income = closedPeriod.incomeAmount ?? 0;
  const awareness = computeAwareness({ previous, current, incomeAmount: income, loggedExpenses });

  return (
    <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">Last period</p>

      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          awareness.savingsChange < 0 ? "text-red-600" : "text-emerald-600"
        }`}
      >
        {signed(awareness.savingsChange)}
      </p>
      <p className="text-xs text-slate-500">
        saved · {formatPHP(previous.total)} → {formatPHP(current.total)}
      </p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Income declared</dt>
          <dd className="tabular-nums">{income > 0 ? formatPHP(income) : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Expenses logged</dt>
          <dd className="tabular-nums">{formatPHP(loggedExpenses)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Bank change</dt>
          <dd className="tabular-nums">{signed(awareness.bankChange)}</dd>
        </div>
        {/* Investments move with the market, so they sit outside the gap math entirely. */}
        <div className="flex justify-between">
          <dt className="text-slate-500">Investments</dt>
          <dd className="tabular-nums">{signed(awareness.investmentChange)}</dd>
        </div>
      </dl>

      <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
        {describeGap(awareness.gap)}
      </p>
    </div>
  );
}
