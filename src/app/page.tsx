"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActivePeriod } from "@/hooks/useActivePeriod";
import { useCategories } from "@/hooks/useCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { CategoryChips } from "@/components/input/CategoryChips";
import { Button } from "@/components/ui/Button";
import { SyncIndicator } from "@/components/SyncIndicator";
import { addExpense } from "@/services/expenses";
import { formatPHP, parseAmount, sanitizeAmountInput } from "@/lib/money";

export default function InputPage() {
  const { user, ready, configured, error } = useAuth();
  // Only query once we actually have an authenticated (anonymous) user —
  // otherwise Firestore rules reject the read with a permissions error.
  const enabled = ready && configured && !!user;

  const { period, loading: periodLoading } = useActivePeriod(enabled);
  const { categories } = useCategories(enabled);
  const { total } = useExpenses(period?.id ?? null);

  const [amountRaw, setAmountRaw] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Pre-focus the amount field on open — no tap needed to start typing (Rule 1).
  useEffect(() => {
    amountRef.current?.focus();
  }, [enabled]);

  // Default to the first category so a log can be one tap + a number.
  useEffect(() => {
    if (!categoryId && categories.length > 0) setCategoryId(categories[0]!.id);
  }, [categories, categoryId]);

  const amount = parseAmount(amountRaw);
  const remaining = period ? period.budgetAmount - total : 0;
  const canSave = enabled && !!period && !!categoryId && amount > 0;

  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Optimistic and synchronous by design. The write lands in the local cache and
   * the total re-renders from the cache listener, so there is nothing to wait
   * for — clearing and refocusing immediately is what keeps the loop under five
   * seconds, and it is also what stops the button sticking on a pending promise
   * while offline. Never make this async.
   */
  function handleSave() {
    if (!canSave || !period || !categoryId) return;
    setSaveError(null);
    addExpense(period.id, { amount, categoryId }, () =>
      setSaveError("Couldn't sync that one — check Categories and try again."),
    );
    setAmountRaw("");
    amountRef.current?.focus();
  }

  if (!configured) {
    return (
      <section className="pt-16 text-center">
        <h1 className="text-lg font-semibold">Almost there</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Set your Firebase config and <code>NEXT_PUBLIC_HOUSEHOLD_ID</code> in{" "}
          <code>.env.local</code> (see <code>.env.example</code>), then restart.
        </p>
      </section>
    );
  }

  if (ready && configured && !user) {
    return (
      <section className="pt-16 text-center">
        <h1 className="text-lg font-semibold">Can&apos;t reach your data</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Couldn&apos;t sign in. In the Firebase console, finish two one-time steps:
        </p>
        <ol className="mx-auto mt-3 max-w-xs list-decimal space-y-1 text-left text-sm text-ink-muted">
          <li>Authentication → Sign-in method → enable <b>Anonymous</b>.</li>
          <li>Firestore → Rules → publish this repo&apos;s <code>firestore.rules</code>.</li>
        </ol>
        {error ? <p className="mt-3 text-xs text-ink-muted">{error}</p> : null}
      </section>
    );
  }

  if (!ready || periodLoading) {
    return <p className="pt-16 text-center text-sm text-ink-muted">Loading…</p>;
  }

  if (!period) {
    return (
      <section className="pt-16 text-center">
        <h1 className="text-lg font-semibold">No budget period yet</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Start a period when income lands — then every expense counts against it.
        </p>
        <Link href="/periods" className="mt-6 inline-block">
          <Button>Declare a period</Button>
        </Link>
      </section>
    );
  }

  const spentFraction =
    period && period.budgetAmount > 0 ? Math.min(total / period.budgetAmount, 1) : 0;

  return (
    // `dvh`, not `vh`: with the native keyboard open (ADR-0003) a `100vh` box
    // keeps its full height, so `mt-auto` pushes Save down behind the keyboard.
    // The dynamic viewport shrinks instead, keeping Save in thumb reach — which
    // is the single biggest determinant of the ≤5s one-handed loop.
    <section className="flex min-h-[100dvh] flex-col pt-4">
      {/* Standing — total + remaining, visible the moment you save (Rule, F1 story 2). */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Remaining</p>
          <p
            className={`text-2xl font-bold ${remaining < 0 ? "text-danger-fg" : "text-ink"}`}
          >
            {formatPHP(remaining)}
          </p>
        </div>
        <div className="text-right">
          <SyncIndicator />
          <p className="mt-1 text-xs text-ink-muted">
            Spent {formatPHP(total)} of {formatPHP(period.budgetAmount)}
          </p>
        </div>
      </header>

      {/* Spent-of-budget at a glance — width animates, motion-reduce kills it. */}
      <div
        data-testid="budget-progress"
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(spentFraction * 100)}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${spentFraction * 100}%` }}
        />
      </div>

      {/* Amount display — pre-focused, accepts the device keyboard too. */}
      <div className="mt-6">
        <input
          ref={amountRef}
          inputMode="decimal"
          aria-label="Amount"
          placeholder="0"
          value={amountRaw}
          onChange={(e) => setAmountRaw(sanitizeAmountInput(e.target.value))}
          className="w-full bg-transparent text-center text-6xl tracking-tight font-bold tabular-nums outline-none"
        />
        <p className="mt-1 text-center text-sm text-ink-muted">{formatPHP(amount)}</p>
      </div>

      <div className="mt-6">
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
      </div>

      <div className="mt-auto space-y-3 pb-4 pt-6">
        {saveError ? (
          <p className="text-center text-sm text-danger-fg">{saveError}</p>
        ) : null}
        <Button onClick={handleSave} disabled={!canSave} className="w-full py-4 text-lg">
          Save
        </Button>
      </div>
    </section>
  );
}
