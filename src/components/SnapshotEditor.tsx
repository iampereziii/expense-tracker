"use client";

import { useState } from "react";
import { usePeriodBalances } from "@/hooks/usePeriodBalances";
import { correctSnapshotBalance } from "@/services/balances";
import { Button } from "@/components/ui/Button";
import { AmountField } from "@/components/ui/AmountField";
import { formatPHP, parseAmount } from "@/lib/money";
import type { BalanceSnapshot } from "@/types";

interface SnapshotEditorProps {
  /** Must be the newest period. Older snapshots are immutable so past reconciliations hold. */
  periodId: string;
  uid: string | null;
}

/** Typo repair for the current cutoff's frozen balances — available until the next
 *  period is declared, at which point this snapshot becomes history. */
export function SnapshotEditor({ periodId, uid }: SnapshotEditorProps) {
  const { snapshots, totals } = usePeriodBalances(periodId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");

  if (snapshots.length === 0) return null;

  function startEdit(snapshot: BalanceSnapshot) {
    setEditingId(snapshot.id);
    setRaw(snapshot.balance ? String(snapshot.balance) : "");
  }

  async function save(snapshot: BalanceSnapshot) {
    const next = parseAmount(raw);
    setEditingId(null);
    if (next === snapshot.balance) return;
    await correctSnapshotBalance(periodId, snapshot.accountId, next, uid);
  }

  return (
    <div className="mt-6 rounded-2xl border border-line p-4">
      <p className="text-sm font-medium">Balances at this cutoff</p>
      <p className="mt-0.5 text-xs text-ink-muted">
        {formatPHP(totals.total)} frozen · correctable until the next period starts
      </p>

      <ul className="mt-3 space-y-1">
        {snapshots.map((snapshot) => (
          <li key={snapshot.id} className="flex items-center justify-between gap-3 py-1">
            <span className="min-w-0 truncate text-sm text-ink-muted">{snapshot.name}</span>
            {editingId === snapshot.id ? (
              <span className="flex shrink-0 items-center gap-2">
                <AmountField
                  label={`Correct ${snapshot.name}`}
                  value={raw}
                  onChange={setRaw}
                  className="w-28 py-1.5 text-right text-sm"
                />
                <Button onClick={() => save(snapshot)} className="px-3 py-1.5 text-sm">
                  Save
                </Button>
              </span>
            ) : (
              <button
                onClick={() => startEdit(snapshot)}
                aria-label={`Correct ${snapshot.name}`}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium tabular-nums active:bg-line"
              >
                {formatPHP(snapshot.balance)}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
