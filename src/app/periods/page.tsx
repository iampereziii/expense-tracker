"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useQueryData } from "@/hooks/useQueryData";
import { useAccounts } from "@/hooks/useAccounts";
import { useSavingsPots } from "@/hooks/useSavingsPots";
import { allPeriodsQuery, declarePeriod, setCarryOver } from "@/services/periods";
import { useCarryOut, useEffectiveBudget } from "@/hooks/useEffectiveBudget";
import { describeCarry } from "@/lib/budget";
import type { SnapshotInput } from "@/services/balances";
import { Button } from "@/components/ui/Button";
import { AmountField } from "@/components/ui/AmountField";
import { Card } from "@/components/ui/Card";
import { AwarenessCard } from "@/components/AwarenessCard";
import { SnapshotEditor } from "@/components/SnapshotEditor";
import { formatPHP, parseAmount } from "@/lib/money";
import { plannedAllocations } from "@/lib/savings";
import { SyncIndicator } from "@/components/SyncIndicator";
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
  /** Off by default — the user decides whether this period continues the last one's month. */
  const [carry, setCarry] = useState(false);
  /** Only accounts the user actually retyped land here — unchanged ones cost zero typing. */
  const [balanceEdits, setBalanceEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incomeAmount = parseAmount(income);
  const planned = plannedAllocations(pots, incomeAmount);

  const activePeriod = periods[0] && periods[0].endDate === null ? periods[0] : null;
  const lastClosed = periods[1] ?? null;

  // A new period would carry from the newest one; the newest itself may carry from the one before.
  const newest = periods[0] ?? null;
  const carryAvailable = useCarryOut(periods, newest?.id ?? null);
  const newestBudget = useEffectiveBudget(periods, newest?.id ?? null);
  const plannedBudget = parseAmount(budget);

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
        carryOver: carry && !!newest,
        uid: user?.uid ?? null,
      });
      setBudget("");
      setIncome("");
      setNote("");
      setCarry(false);
      setBalanceEdits({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the period");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pt-6 pb-24">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Budget periods</h1>
        <SyncIndicator />
      </div>
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
        {/* Carry-over (lib/budget.ts) — only when there's a period to carry from. Off by
            default: the user knows whether this cutoff continues the last one's month. */}
        {newest ? (
          <div className="rounded-xl bg-surface p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                Carry over{" "}
                <span className="tabular-nums text-ink-muted">
                  {describeCarry(carryAvailable, formatPHP)}
                </span>
              </span>
              <input
                type="checkbox"
                checked={carry}
                onChange={(e) => setCarry(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-brand"
              />
            </label>
            {carry ? (
              <p data-testid="carry-preview" className="mt-2 text-xs tabular-nums text-ink-muted">
                {formatPHP(plannedBudget)} {carryAvailable < 0 ? "−" : "+"}{" "}
                {formatPHP(Math.abs(carryAvailable))} ={" "}
                <span className="font-semibold text-ink">
                  {formatPHP(plannedBudget + carryAvailable)}
                </span>{" "}
                to spend
              </p>
            ) : null}
          </div>
        ) : null}
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
          {periods.map((period, index) => {
            const open = period.endDate === null;
            // Only the newest period's carry-over can be fixed after declaring; older
            // ones are history (brief, Risks #6). The oldest has nothing to carry from.
            const editableCarry = index === 0 && periods.length > 1;
            return (
              <li
                key={period.id}
                className="flex items-center justify-between px-0 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">
                    {formatPHP(index === 0 ? newestBudget.total : period.budgetAmount)}
                  </p>
                  {index === 0 && newestBudget.carried !== 0 ? (
                    <p className="text-xs text-ink-muted">
                      {formatPHP(newestBudget.base)} budget ·{" "}
                      {describeCarry(newestBudget.carried, formatPHP)}
                    </p>
                  ) : index > 0 && period.carryOver ? (
                    <p className="text-xs text-ink-muted">Carried over from last period</p>
                  ) : null}
                  <p className="text-xs text-ink-muted">
                    {period.incomeAmount
                      ? `${formatPHP(period.incomeAmount)} income`
                      : "No income declared"}
                    {period.incomeNote ? ` · ${period.incomeNote}` : ""}
                  </p>
                  {editableCarry ? (
                    <label className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                      <input
                        type="checkbox"
                        checked={period.carryOver === true}
                        onChange={(e) =>
                          setCarryOver(period.id, e.target.checked, () =>
                            setError("Couldn't update carry-over. Try again."),
                          )
                        }
                        className="h-4 w-4 accent-brand"
                      />
                      Carry over from last period
                    </label>
                  ) : null}
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
