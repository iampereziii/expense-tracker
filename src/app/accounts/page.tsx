"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAccounts } from "@/hooks/useAccounts";
import {
  addAccount,
  archiveAccount,
  renameAccount,
  setAccountBalance,
} from "@/services/accounts";
import { Button } from "@/components/ui/Button";
import { AmountField } from "@/components/ui/AmountField";
import { Card } from "@/components/ui/Card";
import { MoneySwitch } from "@/components/MoneySwitch";
import { formatPHP, parseAmount } from "@/lib/money";
import type { Account, AccountType } from "@/types";

const TYPE_LABEL: Record<AccountType, string> = {
  bank: "Bank",
  investment: "Investment",
};

export default function AccountsPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;
  const { accounts, totals } = useAccounts(enabled);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [busy, setBusy] = useState(false);
  /** Which account's balance is open for editing, and its in-progress raw value. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRaw, setEditRaw] = useState("");

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await addAccount(trimmed, type);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setEditRaw(account.balance ? String(account.balance) : "");
  }

  async function saveEdit(account: Account) {
    const next = parseAmount(editRaw);
    setEditingId(null);
    if (next === account.balance) return;
    await setAccountBalance(account.id, next, user?.uid ?? null);
  }

  async function handleRename(account: Account) {
    const next = window.prompt("Rename account", account.name);
    if (next && next.trim() && next.trim() !== account.name) {
      await renameAccount(account.id, next.trim());
    }
  }

  async function handleArchive(account: Account) {
    // Archive, not delete — past cutoff snapshots keep pointing at this account (Rule 7).
    if (
      window.confirm(
        `Remove "${account.name}"? Past cutoff snapshots keep it, it just leaves this list.`,
      )
    ) {
      await archiveAccount(account.id);
    }
  }

  return (
    <section className="pt-6 pb-24">
      <MoneySwitch />
      <h1 className="text-lg font-semibold">Accounts</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Where your money actually sits. Tap a balance to update it anytime.
      </p>

      <Card className="mt-4 bg-surface-sunken">
        <p className="text-xs uppercase tracking-wide text-ink-muted">Total savings</p>
        <p className="text-3xl font-bold tabular-nums">{formatPHP(totals.total)}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {formatPHP(totals.bank)} in banks · {formatPHP(totals.investment)} invested
        </p>
      </Card>

      <Card className="mt-3">
        <ul className="divide-y divide-line">
          {accounts.map((account) => (
            <li key={account.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.name}</p>
                  <p className="text-xs text-ink-muted">{TYPE_LABEL[account.type]}</p>
                </div>
                {editingId === account.id ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <AmountField
                      label={`Balance for ${account.name}`}
                      value={editRaw}
                      onChange={setEditRaw}
                      className="w-28 py-2 text-right"
                    />
                    <Button onClick={() => saveEdit(account)} className="px-3 py-2 text-sm">
                      Save
                    </Button>
                  </span>
                ) : (
                  <button
                    onClick={() => startEdit(account)}
                    aria-label={`Edit balance for ${account.name}`}
                    className="shrink-0 rounded-lg px-2 py-1 text-right text-lg font-semibold tabular-nums active:bg-line"
                  >
                    {formatPHP(account.balance)}
                  </button>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => handleRename(account)}
                  className="px-3 py-1.5 text-sm"
                >
                  Rename
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleArchive(account)}
                  className="px-3 py-1.5 text-sm"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {accounts.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No accounts yet. Add each bank or investment you keep money in.
          </p>
        ) : null}
      </Card>

      <Card className="mt-3 bg-surface-sunken space-y-3">
        <p className="text-sm font-medium">New account</p>
        <input
          placeholder="Account name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line px-3 py-3 outline-none"
        />
        <div className="flex gap-2">
          {(["bank", "investment"] as const).map((option) => (
            <Button
              key={option}
              variant={type === option ? "primary" : "ghost"}
              onClick={() => setType(option)}
              className="flex-1 py-2 text-sm"
            >
              {TYPE_LABEL[option]}
            </Button>
          ))}
        </div>
        <Button onClick={handleAdd} disabled={busy || !name.trim()} className="w-full">
          Add account
        </Button>
      </Card>
    </section>
  );
}
