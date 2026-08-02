"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useQueryData } from "@/hooks/useQueryData";
import { useAccounts } from "@/hooks/useAccounts";
import { useSavingsPots } from "@/hooks/useSavingsPots";
import { allPeriodsQuery, declarePeriod } from "@/services/periods";
import type { SnapshotInput } from "@/services/balances";
import { Button } from "@/components/ui/Button";
import { AmountField } from "@/components/ui/AmountField";
import { Card } from "@/components/ui/Card";
import { AwarenessCard } from "@/components/AwarenessCard";
import { SnapshotEditor } from "@/components/SnapshotEditor";
import { formatPHP, parseAmount } from "@/lib/money";
import { plannedAllocations } from "@/lib/savings";
import type { Period } from "@/types";

export default function PeriodsPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;
  const { data: periods } = useQueryData<Period>(
    () => (enabled ? allPeriodsQuery() : null),
    [enabled],
  );
  const { accounts } = useAccounts(enabled);
  const { pots } = useSavingsPots(enabled);

  const [budget, setBudget] = useState("");
  const [income, setIncome] = useState("");
  const [note, setNote] = useState("");
  /** Only accounts the user actually retyped land here — unchanged ones cost zero typing. */
  const [balanceEdits, setBalanceEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomeAmount = parseAmount(income);
  const planned = plannedAllocations(pots, incomeAmount);

  const activePeriod = periods[0] && periods[0].endDate === null ? periods[0] : null;
  const lastClosed = periods[1] ?? null;

  function balanceValue(accountId: string, liveBalance: number): string {
    return balanceEdits[accountId] ?? (liveBalance ? String(liveBalance) : "");
  }

  async function handleDeclare() {
    const budgetAmount = parseAmount(budget);
    if (budgetAmount <= 0) return;

    const balances: SnapshotInput[] = accounts.map((account) => {
      const liveBalance = account.balance ?? 0;
      return {
        accountId: account.id,
        name: account.name,
        type: account.type,
        balance: parseAmount(balanceValue(account.id, liveBalance)),
        liveBalance,
      };
    });

    setBusy(true);
    setError(null);
    try {
      await declarePeriod({
        budgetAmount,
        incomeAmount,
        incomeNote: note,
        balances,
        pots,
        uid: user?.uid ?? null,
      });
      setBudget("");
      setIncome("");
      setNote("");
      setBalanceEdits({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the period");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pt-6 pb-24">
      <h1 className="text-lg font-semibold">Budget periods</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Start a new period when income lands. It closes the previous one and freezes your
        balances as that cutoff.
      </p>

      <Card tone="sunken" className="mt-4 space-y-3">
        <AmountField
          label="Budget amount"
          placeholder="Budget amount"
          value={budget}
          onChange={setBudget}
          className="w-full"
        />
        <AmountField
          label="Income amount"
          placeholder="Income amount (optional)"
          value={income}
          onChange={setIncome}
          className="w-full"
        />
        <input
          placeholder="Income note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-line px-3 py-3 outline-none"
        />

        {/* Balance review — pre-filled from the live balances, so a cutoff with nothing
            to change is still a single tap. Skippable: no accounts, no step. */}
        {accounts.length > 0 ? (
          <div className="rounded-xl bg-surface p-3">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Balances at this cutoff
            </p>
            <ul className="mt-2 space-y-2">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-ink-muted">
                    {account.name}
                  </span>
                  <AmountField
                    label={`Balance for ${account.name}`}
                    value={balanceValue(account.id, account.balance ?? 0)}
                    onChange={(next) =>
                      setBalanceEdits((prev) => ({ ...prev, [account.id]: next }))
                    }
                    className="w-32 shrink-0 py-2 text-right"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* What the pots' percentage rules will take from this income, before committing. */}
        {planned.length > 0 ? (
          <div className="rounded-xl bg-surface p-3">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Savings allocations
            </p>
            <ul className="mt-2 space-y-1">
              {planned.map(({ pot, amount }) => (
                <li key={pot.id} className="flex justify-between text-sm">
                  <span className="text-ink-muted">
                    {pot.name} · {pot.incomePercent}%
                  </span>
                  <span className="tabular-nums">{formatPHP(amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger-fg">{error}</p> : null}
        <Button onClick={handleDeclare} disabled={busy || !budget} className="w-full">
          {busy ? "Starting…" : "Start new period"}
        </Button>
      </Card>

      {lastClosed ? (
        <Card className="mt-3 border border-line">
          <AwarenessCard closedPeriod={lastClosed} nextPeriodId={periods[0]!.id} />
        </Card>
      ) : null}

      {activePeriod ? (
        <Card className="mt-3 border border-line">
          <SnapshotEditor periodId={activePeriod.id} uid={user?.uid ?? null} />
        </Card>
      ) : null}

      <Card className="mt-3">
        <ul className="divide-y divide-line">
          {periods.map((period) => {
            const open = period.endDate === null;
            return (
              <li
                key={period.id}
                className="flex items-center justify-between px-0 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{formatPHP(period.budgetAmount)}</p>
                  <p className="text-xs text-ink-muted">
                    {period.incomeAmount
                      ? `${formatPHP(period.incomeAmount)} income`
                      : "No income declared"}
                    {period.incomeNote ? ` · ${period.incomeNote}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    open ? "bg-ok-bg text-ok-fg" : "bg-surface-sunken text-ink-muted"
                  }`}
                >
                  {open ? "Active" : "Closed"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
