"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActivePeriod } from "@/hooks/useActivePeriod";
import { useCategories } from "@/hooks/useCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { Keypad } from "@/components/input/Keypad";
import { CategoryChips } from "@/components/input/CategoryChips";
import { Button } from "@/components/ui/Button";
import { SyncIndicator } from "@/components/SyncIndicator";
import { addExpense } from "@/services/expenses";
import { formatPHP, parseAmount } from "@/lib/money";

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
  const [saving, setSaving] = useState(false);
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
  const canSave = enabled && !!period && !!categoryId && amount > 0 && !saving;

  function handleKey(key: string) {
    setAmountRaw((prev) => {
      if (key === "←") return prev.slice(0, -1);
      if (key === "." && prev.includes(".")) return prev;
      // Cap to 2 decimal places.
      if (prev.includes(".") && prev.split(".")[1]!.length >= 2 && key !== "←") return prev;
      return prev + key;
    });
  }

  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!canSave || !period || !categoryId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await addExpense(period.id, { amount, categoryId });
      setAmountRaw("");
      amountRef.current?.focus();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  if (!configured) {
    return (
      <section className="pt-16 text-center">
        <h1 className="text-lg font-semibold">Almost there</h1>
        <p className="mt-2 text-sm text-slate-500">
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
        <p className="mt-2 text-sm text-slate-500">
          Couldn&apos;t sign in. In the Firebase console, finish two one-time steps:
        </p>
        <ol className="mx-auto mt-3 max-w-xs list-decimal space-y-1 text-left text-sm text-slate-500">
          <li>Authentication → Sign-in method → enable <b>Anonymous</b>.</li>
          <li>Firestore → Rules → publish this repo&apos;s <code>firestore.rules</code>.</li>
        </ol>
        {error ? <p className="mt-3 text-xs text-slate-300">{error}</p> : null}
      </section>
    );
  }

  if (!ready || periodLoading) {
    return <p className="pt-16 text-center text-sm text-slate-400">Loading…</p>;
  }

  if (!period) {
    return (
      <section className="pt-16 text-center">
        <h1 className="text-lg font-semibold">No budget period yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          Start a period when income lands — then every expense counts against it.
        </p>
        <Link href="/periods" className="mt-6 inline-block">
          <Button>Declare a period</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="flex min-h-screen flex-col pt-4">
      {/* Standing — total + remaining, visible the moment you save (Rule, F1 story 2). */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Remaining</p>
          <p
            className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : "text-slate-900"}`}
          >
            {formatPHP(remaining)}
          </p>
        </div>
        <div className="text-right">
          <SyncIndicator />
          <p className="mt-1 text-xs text-slate-400">
            Spent {formatPHP(total)} of {formatPHP(period.budgetAmount)}
          </p>
        </div>
      </header>

      {/* Amount display — pre-focused, accepts the device keyboard too. */}
      <div className="mt-6">
        <input
          ref={amountRef}
          inputMode="decimal"
          aria-label="Amount"
          placeholder="0"
          value={amountRaw}
          onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full bg-transparent text-center text-5xl font-bold tabular-nums outline-none"
        />
        <p className="mt-1 text-center text-sm text-slate-400">{formatPHP(amount)}</p>
      </div>

      <div className="mt-6">
        <CategoryChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
      </div>

      <div className="mt-auto space-y-3 pb-4 pt-6">
        <Keypad onKey={handleKey} />
        {saveError ? (
          <p className="text-center text-sm text-red-600">{saveError}</p>
        ) : null}
        <Button onClick={handleSave} disabled={!canSave} className="w-full py-4 text-lg">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}
