"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useQueryData } from "@/hooks/useQueryData";
import { allPeriodsQuery, declarePeriod } from "@/services/periods";
import { Button } from "@/components/ui/Button";
import { formatPHP } from "@/lib/money";
import type { Period } from "@/types";

export default function PeriodsPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;
  const { data: periods } = useQueryData<Period>(
    () => (enabled ? allPeriodsQuery() : null),
    [enabled],
  );

  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleDeclare() {
    const amount = Number.parseFloat(budget);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    try {
      await declarePeriod(amount, note);
      setBudget("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pt-6">
      <h1 className="text-lg font-semibold">Budget periods</h1>
      <p className="mt-1 text-sm text-slate-500">
        Start a new period when income lands. It closes the previous one.
      </p>

      <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
        <input
          inputMode="decimal"
          placeholder="Budget amount"
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none"
        />
        <input
          placeholder="Income note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none"
        />
        <Button onClick={handleDeclare} disabled={busy || !budget} className="w-full">
          {busy ? "Starting…" : "Start new period"}
        </Button>
      </div>

      <ul className="mt-6 space-y-2">
        {periods.map((p) => {
          const open = p.endDate === null;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
            >
              <div>
                <p className="font-medium">{formatPHP(p.budgetAmount)}</p>
                {p.incomeNote ? (
                  <p className="text-xs text-slate-400">{p.incomeNote}</p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  open ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                }`}
              >
                {open ? "Active" : "Closed"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
