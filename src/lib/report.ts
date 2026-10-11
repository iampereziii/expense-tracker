import { roundCentavos } from "@/lib/money";
import type { Expense } from "@/types";

/**
 * Pure aggregation for the /report page (feature brief: report view of logged
 * expenses). Totals are derived here on every render, never stored (Rule 10).
 */

/** An expense flattened for display: `when` is always a real Date. */
export interface ReportRow {
  id: string;
  amount: number;
  categoryId: string;
  note: string | null;
  when: Date;
}

/**
 * Flatten an expense. An offline save that took the default date carries a
 * pending serverTimestamp, which reads back as null until the write syncs —
 * it was logged just now, so it files under `now` instead of crashing the list.
 */
export function toReportRow(expense: Expense, now: Date = new Date()): ReportRow {
  return {
    id: expense.id,
    amount: expense.amount || 0,
    categoryId: expense.categoryId,
    note: expense.note ?? null,
    when: expense.date?.toDate() ?? now,
  };
}

/** Period total, rounded to whole centavos. */
export function sumRows(rows: ReadonlyArray<Pick<ReportRow, "amount">>): number {
  return roundCentavos(rows.reduce((sum, r) => sum + r.amount, 0));
}

export interface CategorySpend {
  categoryId: string;
  total: number;
  /** 0–1 share of the period total (bars sum to 100%). 0 when nothing was spent. */
  share: number;
}

/** Spend per category, largest first. Categories with no spend are omitted. */
export function spendByCategory(rows: ReadonlyArray<ReportRow>): CategorySpend[] {
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    byCategory.set(r.categoryId, (byCategory.get(r.categoryId) ?? 0) + r.amount);
  }
  const periodTotal = sumRows(rows);
  return [...byCategory.entries()]
    .map(([categoryId, sum]) => {
      const total = roundCentavos(sum);
      return { categoryId, total, share: periodTotal > 0 ? total / periodTotal : 0 };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Local-calendar day key, e.g. "2026-10-11". Local, not UTC — a 23:30 expense stays on its day. */
export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export interface DayGroup {
  key: string;
  /** Any row's `when` from that day — used only for the header label. */
  date: Date;
  total: number;
  rows: ReportRow[];
}

/** Rows grouped by local day, newest day first; rows newest first within a day. */
export function groupByDay(rows: ReadonlyArray<ReportRow>): DayGroup[] {
  const groups = new Map<string, ReportRow[]>();
  for (const r of rows) {
    const key = dayKey(r.when);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.when.getTime() - a.when.getTime());
      return { key, date: sorted[0]!.when, total: sumRows(sorted), rows: sorted };
    })
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

export interface BudgetStatus {
  /** budget − spent, never negative. */
  remaining: number;
  /** spent − budget when over, else 0. */
  over: number;
}

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  const diff = roundCentavos(budget - spent);
  return diff >= 0 ? { remaining: diff, over: 0 } : { remaining: 0, over: -diff };
}
