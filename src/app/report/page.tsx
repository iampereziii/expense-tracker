"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePeriods } from "@/hooks/usePeriods";
import { useAllCategories } from "@/hooks/useAllCategories";
import { useExpenses } from "@/hooks/useExpenses";
import { deleteExpense } from "@/services/expenses";
import { Card } from "@/components/ui/Card";
import { SyncIndicator } from "@/components/SyncIndicator";
import { PeriodPicker } from "@/components/report/PeriodPicker";
import { CategoryBreakdown } from "@/components/report/CategoryBreakdown";
import { ExpenseList } from "@/components/report/ExpenseList";
import { formatPHP } from "@/lib/money";
import {
  budgetStatus,
  groupByDay,
  spendByCategory,
  sumRows,
  toReportRow,
  type ReportRow,
} from "@/lib/report";
import type { Category } from "@/types";

/**
 * F5 — Report (feature brief: report view of logged expenses). One page: period
 * picker → total vs budget → spend by category (CSS bars, no chart library) →
 * every logged expense grouped by day. Tapping a category filters the list.
 * Reads come from the Firestore cache, so it works offline like the rest of the app.
 */
export default function ReportPage() {
  const { user, ready, configured } = useAuth();
  const enabled = ready && configured && !!user;

  const { periods, loading: periodsLoading } = usePeriods(enabled);
  const { categories } = useAllCategories(enabled);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Default to the open period; fall back to the newest if none is open.
  const period =
    periods.find((p) => p.id === pickedId) ??
    periods.find((p) => p.endDate === null) ??
    periods[0] ??
    null;
  const isOpen = period?.endDate === null;

  const { expenses, loading: expensesLoading } = useExpenses(period?.id ?? null);

  const categoriesById = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );
  const rows = useMemo(() => expenses.map((e) => toReportRow(e)), [expenses]);
  const spent = sumRows(rows);
  const spend = useMemo(() => spendByCategory(rows), [rows]);
  const groups = useMemo(
    () => groupByDay(categoryFilter ? rows.filter((r) => r.categoryId === categoryFilter) : rows),
    [rows, categoryFilter],
  );

  function selectPeriod(id: string) {
    setPickedId(id);
    setCategoryFilter(null);
  }

  function handleDelete(row: ReportRow) {
    if (!period || !isOpen) return;
    const name = categoriesById.get(row.categoryId)?.name ?? "expense";
    const note = row.note ? ` (${row.note})` : "";
    if (!window.confirm(`Delete ${formatPHP(row.amount)} · ${name}${note}? This can't be undone.`)) {
      return;
    }
    setError(null);
    deleteExpense(period.id, row.id, () => setError("Couldn't delete that expense. Try again."));
  }

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h1 className="text-lg font-semibold">Report</h1>
      <SyncIndicator />
    </div>
  );

  if (!periodsLoading && !period) {
    return (
      <section className="pt-6 pb-24">
        {header}
        <Card className="mt-4 text-sm">
          No budget period yet.{" "}
          <Link href="/periods" className="font-medium text-brand">
            Declare one
          </Link>{" "}
          to start a report.
        </Card>
      </section>
    );
  }

  const status = period ? budgetStatus(spent, period.budgetAmount) : null;
  const filteredName = categoryFilter ? categoriesById.get(categoryFilter)?.name : null;

  return (
    <section className="pt-6 pb-24">
      {header}

      {period ? (
        <div className="mt-3">
          <PeriodPicker periods={periods} selectedId={period.id} onSelect={selectPeriod} />
        </div>
      ) : null}

      {period && status ? (
        <Card tone="sunken" className="mt-3">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Spent</p>
          <p className="text-3xl font-bold tabular-nums">{formatPHP(spent)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            of {formatPHP(period.budgetAmount)} budget · {rows.length}{" "}
            {rows.length === 1 ? "expense" : "expenses"}
          </p>
          {status.over > 0 ? (
            <p className="mt-2 text-sm font-semibold text-danger-fg">
              {formatPHP(status.over)} over budget
            </p>
          ) : (
            <p className="mt-2 text-sm font-medium text-ok-fg">
              {formatPHP(status.remaining)} left
            </p>
          )}
        </Card>
      ) : null}

      {spend.length > 0 ? (
        <Card className="mt-3">
          <CategoryBreakdown
            spend={spend}
            categoriesById={categoriesById}
            selectedId={categoryFilter}
            onSelect={setCategoryFilter}
          />
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-sm text-danger-fg">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold">
          {filteredName ? `${filteredName} expenses` : "All expenses"}
        </h2>
        {categoryFilter ? (
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className="rounded-full px-3 py-1 text-sm font-medium text-brand active:bg-surface-sunken"
          >
            Show all
          </button>
        ) : null}
      </div>

      <div className="mt-2">
        {!expensesLoading && rows.length === 0 ? (
          <Card className="text-sm text-ink-muted">
            Nothing logged in this period yet.{" "}
            {isOpen ? (
              <Link href="/" className="font-medium text-brand">
                Log an expense
              </Link>
            ) : null}
          </Card>
        ) : (
          <ExpenseList
            groups={groups}
            categoriesById={categoriesById}
            onDelete={isOpen ? handleDelete : undefined}
          />
        )}
      </div>
    </section>
  );
}
