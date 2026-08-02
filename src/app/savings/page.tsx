"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAccounts } from "@/hooks/useAccounts";
import { useSavingsPots } from "@/hooks/useSavingsPots";
import {
  addPot,
  addPotEntry,
  archivePot,
  movePotFunds,
  renamePot,
  setPotPercent,
} from "@/services/savings";
import { Button } from "@/components/ui/Button";
import { AmountField } from "@/components/ui/AmountField";
import { Card } from "@/components/ui/Card";
import { MoneySwitch } from "@/components/MoneySwitch";
import { formatPHP, parseAmount } from "@/lib/money";
import { derivedSavingsMain } from "@/lib/savings";
import type { Allocation, SavingsPot } from "@/types";

function historyLabel(entry: Allocation): string {
  const when = entry.createdAt ? entry.createdAt.toDate().toLocaleDateString() : "Syncing…";
  return `${when} · ${entry.note ?? (entry.kind === "income" ? "Income" : "Manual")}`;
}

export default function SavingsPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;
  const uid = user?.uid ?? null;

  const { totals } = useAccounts(enabled);
  const { pots, allocations, balances, potTotal } = useSavingsPots(enabled);

  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [busy, setBusy] = useState(false);
  const [openPotId, setOpenPotId] = useState<string | null>(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [moveTargetId, setMoveTargetId] = useState("");

  // Savings main is derived, never stored: real bank money that no pot has claimed.
  const savingsMain = derivedSavingsMain(totals.bank, potTotal);

  async function handleAddPot() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const rule = percent.trim() ? Number.parseFloat(percent) : null;
      await addPot(trimmed, Number.isFinite(rule as number) ? (rule as number) : null);
      setName("");
      setPercent("");
    } finally {
      setBusy(false);
    }
  }

  function togglePot(potId: string) {
    setOpenPotId((current) => (current === potId ? null : potId));
    setAmountRaw("");
    setMoveTargetId("");
  }

  async function handleEntry(potId: string, direction: 1 | -1) {
    const amount = parseAmount(amountRaw);
    if (amount <= 0) return;
    setAmountRaw("");
    await addPotEntry(potId, amount * direction, direction > 0 ? "Added" : "Withdrawn", uid);
  }

  async function handleMove(fromPotId: string) {
    const amount = parseAmount(amountRaw);
    if (amount <= 0 || !moveTargetId) return;
    setAmountRaw("");
    setMoveTargetId("");
    await movePotFunds(fromPotId, moveTargetId, amount, uid);
  }

  async function handleRename(pot: SavingsPot) {
    const next = window.prompt("Rename pot", pot.name);
    if (next && next.trim() && next.trim() !== pot.name) await renamePot(pot.id, next.trim());
  }

  async function handleRule(pot: SavingsPot) {
    const next = window.prompt(
      "Percent of income to auto-save here (blank for none)",
      pot.incomePercent ? String(pot.incomePercent) : "",
    );
    if (next === null) return;
    const parsed = next.trim() ? Number.parseFloat(next) : null;
    await setPotPercent(pot.id, Number.isFinite(parsed as number) ? (parsed as number) : null);
  }

  async function handleArchive(pot: SavingsPot) {
    if (
      window.confirm(`Remove "${pot.name}"? Its ${formatPHP(balances[pot.id] ?? 0)} returns to main.`)
    ) {
      await archivePot(pot.id);
    }
  }

  return (
    <section className="pt-6 pb-24">
      <MoneySwitch />
      <h1 className="text-lg font-semibold">Savings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Pots split your real bank savings into goals — no actual transfers needed.
      </p>

      <Card className="mt-4 bg-surface-sunken">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Unallocated (main)</p>
        <p
          className={`text-3xl font-bold tabular-nums ${
            savingsMain < 0 ? "text-danger-fg" : "text-ink"
          }`}
        >
          {formatPHP(savingsMain)}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          {formatPHP(totals.bank)} in banks · {formatPHP(potTotal)} in pots
        </p>
        {savingsMain < 0 ? (
          <p className="mt-2 text-xs text-danger-fg">
            Pots claim more than your banks hold — you&apos;re over-allocating.
          </p>
        ) : null}
      </Card>

      <Card className="mt-3">
        <ul className="divide-y divide-line">
          {pots.map((pot) => {
            const expanded = openPotId === pot.id;
            const history = allocations.filter((entry) => entry.potId === pot.id).slice(0, 5);
            const others = pots.filter((other) => other.id !== pot.id);

            return (
              <li key={pot.id} className="py-3 first:pt-0 last:pb-0">
                <button
                  onClick={() => togglePot(pot.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{pot.name}</span>
                    <span className="text-xs text-ink-muted">
                      {pot.incomePercent ? `${pot.incomePercent}% of income` : "Manual"}
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold tabular-nums">
                    {formatPHP(balances[pot.id] ?? 0)}
                  </span>
                </button>

                {expanded ? (
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    <div className="flex gap-2">
                      <AmountField
                        label={`Amount for ${pot.name}`}
                        value={amountRaw}
                        onChange={setAmountRaw}
                        className="min-w-0 flex-1 py-2"
                      />
                      <Button
                        onClick={() => handleEntry(pot.id, 1)}
                        className="px-3 py-2 text-sm"
                      >
                        Add
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleEntry(pot.id, -1)}
                        className="px-3 py-2 text-sm"
                      >
                        Take
                      </Button>
                    </div>

                    {others.length > 0 ? (
                      <div className="flex gap-2">
                        <select
                          aria-label={`Move from ${pot.name} to`}
                          value={moveTargetId}
                          onChange={(e) => setMoveTargetId(e.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm outline-none"
                        >
                          <option value="">Move to…</option>
                          {others.map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          onClick={() => handleMove(pot.id)}
                          disabled={!moveTargetId}
                          className="px-3 py-2 text-sm"
                        >
                          Move
                        </Button>
                      </div>
                    ) : null}

                    {history.length > 0 ? (
                      <ul className="space-y-1">
                        {history.map((entry) => (
                          <li key={entry.id} className="flex justify-between text-xs text-ink-muted">
                            <span className="min-w-0 truncate">{historyLabel(entry)}</span>
                            <span className="shrink-0 tabular-nums">
                              {entry.amount > 0 ? "+" : ""}
                              {formatPHP(entry.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-ink-muted">Nothing in this pot yet.</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleRename(pot)}
                        className="px-3 py-1.5 text-sm"
                      >
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRule(pot)}
                        className="px-3 py-1.5 text-sm"
                      >
                        Rule
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleArchive(pot)}
                        className="px-3 py-1.5 text-sm"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {pots.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No pots yet. Add one, give it a percentage, and it fills itself each period.
          </p>
        ) : null}
      </Card>

      <Card className="mt-3 bg-surface-sunken space-y-3">
        <p className="text-sm font-medium">New pot</p>
        <input
          placeholder="Pot name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line px-3 py-3 outline-none"
        />
        <input
          inputMode="decimal"
          aria-label="Percent of income"
          placeholder="% of income (optional)"
          value={percent}
          onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full rounded-xl border border-line px-3 py-3 outline-none"
        />
        <Button onClick={handleAddPot} disabled={busy || !name.trim()} className="w-full">
          Add pot
        </Button>
      </Card>
    </section>
  );
}
