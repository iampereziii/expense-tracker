import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  budgetStatus,
  dayKey,
  groupByDay,
  spendByCategory,
  sumRows,
  toReportRow,
  type ReportRow,
} from "@/lib/report";
import type { Expense } from "@/types";

function row(id: string, amount: number, categoryId: string, when: Date): ReportRow {
  return { id, amount, categoryId, note: null, when };
}

describe("toReportRow", () => {
  it("uses the expense date", () => {
    const when = new Date(2026, 9, 10, 12);
    const expense: Expense = {
      id: "e1",
      amount: 120,
      categoryId: "food",
      note: "lunch",
      date: Timestamp.fromDate(when),
      createdAt: Timestamp.fromDate(when),
    };
    expect(toReportRow(expense)).toEqual({
      id: "e1",
      amount: 120,
      categoryId: "food",
      note: "lunch",
      when,
    });
  });

  it("files a pending (null) date under now", () => {
    const now = new Date(2026, 9, 11, 8);
    const pending = { id: "e2", amount: 50, categoryId: "food", date: null } as unknown as Expense;
    expect(toReportRow(pending, now).when).toBe(now);
    expect(toReportRow(pending, now).note).toBeNull();
  });
});

describe("spendByCategory", () => {
  const d = new Date(2026, 9, 11);

  it("sums per category, largest first", () => {
    const result = spendByCategory([
      row("1", 100, "food", d),
      row("2", 300, "bills", d),
      row("3", 50.5, "food", d),
    ]);
    expect(result.map((c) => [c.categoryId, c.total])).toEqual([
      ["bills", 300],
      ["food", 150.5],
    ]);
  });

  it("category totals add up exactly to the period total", () => {
    const rows = [
      row("1", 0.1, "a", d),
      row("2", 0.2, "b", d),
      row("3", 0.7, "a", d),
      row("4", 1234.56, "c", d),
    ];
    const totals = spendByCategory(rows).map((c) => c.total);
    const summed = Math.round(totals.reduce((s, t) => s + t, 0) * 100) / 100;
    expect(summed).toBe(sumRows(rows));
    expect(sumRows(rows)).toBe(1235.56);
  });

  it("shares sum to 1", () => {
    const shares = spendByCategory([row("1", 25, "a", d), row("2", 75, "b", d)]).map(
      (c) => c.share,
    );
    expect(shares).toEqual([0.75, 0.25]);
  });

  it("returns nothing for an empty period", () => {
    expect(spendByCategory([])).toEqual([]);
  });
});

describe("dayKey", () => {
  it("uses the local calendar day, late evening included", () => {
    expect(dayKey(new Date(2026, 9, 11, 23, 30))).toBe("2026-10-11");
    expect(dayKey(new Date(2026, 0, 2, 0, 5))).toBe("2026-01-02");
  });
});

describe("groupByDay", () => {
  it("groups newest day first, with subtotals and rows newest first", () => {
    const groups = groupByDay([
      row("a", 10, "x", new Date(2026, 9, 10, 9)),
      row("b", 20, "x", new Date(2026, 9, 11, 8)),
      row("c", 30, "y", new Date(2026, 9, 11, 19)),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["2026-10-11", "2026-10-10"]);
    expect(groups[0]!.total).toBe(50);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(["c", "b"]);
    expect(groups[1]!.total).toBe(10);
  });

  it("puts every row in exactly one group", () => {
    const rows = [
      row("a", 1, "x", new Date(2026, 9, 1)),
      row("b", 2, "x", new Date(2026, 9, 2)),
      row("c", 3, "x", new Date(2026, 9, 2)),
    ];
    const ids = groupByDay(rows).flatMap((g) => g.rows.map((r) => r.id));
    expect(ids.sort()).toEqual(["a", "b", "c"]);
  });
});

describe("budgetStatus", () => {
  it("reports remaining when under budget", () => {
    expect(budgetStatus(7_500, 10_000)).toEqual({ remaining: 2_500, over: 0 });
  });

  it("reports the over amount when spent exceeds budget", () => {
    expect(budgetStatus(10_250.5, 10_000)).toEqual({ remaining: 0, over: 250.5 });
  });

  it("is neither under nor over at exactly the budget", () => {
    expect(budgetStatus(10_000, 10_000)).toEqual({ remaining: 0, over: 0 });
  });
});
