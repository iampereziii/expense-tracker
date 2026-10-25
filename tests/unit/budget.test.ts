import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import { carryChain, carryOut, describeCarry, effectiveBudget } from "@/lib/budget";
import { formatPHP } from "@/lib/money";
import type { Period } from "@/types";

function period(id: string, budgetAmount: number, carryOver?: boolean): Period {
  const at = Timestamp.fromDate(new Date(2026, 9, 1));
  const p: Period = { id, startDate: at, endDate: null, budgetAmount, createdAt: at };
  return carryOver === undefined ? p : { ...p, carryOver };
}

const spent = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe("effectiveBudget", () => {
  it("is the base budget when there is no previous period", () => {
    const periods = [period("p1", 10000, true)];
    expect(effectiveBudget(periods, "p1", spent({}))).toEqual({
      base: 10000,
      carried: 0,
      total: 10000,
    });
  });

  it("adds the previous period's unspent remainder", () => {
    // Newest first: p2 (Nov 15) carries from p1 (Oct 30).
    const periods = [period("p2", 10000, true), period("p1", 10000)];
    expect(effectiveBudget(periods, "p2", spent({ p1: 8760 }))).toEqual({
      base: 10000,
      carried: 1240,
      total: 11240,
    });
  });

  it("deducts the previous period's overspend", () => {
    const periods = [period("p2", 10000, true), period("p1", 10000)];
    expect(effectiveBudget(periods, "p2", spent({ p1: 11000 })).total).toBe(9000);
  });

  it("can go below zero — no floor", () => {
    const periods = [period("p2", 2000, true), period("p1", 10000)];
    expect(effectiveBudget(periods, "p2", spent({ p1: 13000 }))).toEqual({
      base: 2000,
      carried: -3000,
      total: -1000,
    });
  });

  it("ignores the previous period when the toggle is off", () => {
    const periods = [period("p2", 10000, false), period("p1", 10000)];
    expect(effectiveBudget(periods, "p2", spent({ p1: 5000 })).total).toBe(10000);
  });

  it("treats a legacy period with no flag as no carry", () => {
    const periods = [period("p2", 10000), period("p1", 10000)];
    expect(effectiveBudget(periods, "p2", spent({ p1: 5000 })).carried).toBe(0);
  });

  it("chains through three periods in one month", () => {
    // p1 leaves 1,000; p2 = 5,000 + 1,000 = 6,000, spends 4,500 → leaves 1,500.
    const periods = [period("p3", 5000, true), period("p2", 5000, true), period("p1", 5000)];
    const s = spent({ p1: 4000, p2: 4500 });
    expect(effectiveBudget(periods, "p2", s).total).toBe(6000);
    expect(effectiveBudget(periods, "p3", s)).toEqual({ base: 5000, carried: 1500, total: 6500 });
  });

  it("stops the chain at the first period that doesn't carry", () => {
    // p2 starts fresh, so p1's overspend never reaches p3.
    const periods = [period("p3", 5000, true), period("p2", 5000, false), period("p1", 5000)];
    const s = spent({ p1: 9000, p2: 4000 });
    expect(effectiveBudget(periods, "p3", s).carried).toBe(1000);
  });

  it("rounds to whole centavos", () => {
    const periods = [period("p2", 100.1, true), period("p1", 100.2)];
    expect(effectiveBudget(periods, "p2", spent({ p1: 0.3 })).total).toBe(200);
  });

  it("returns zeros for an unknown period", () => {
    expect(effectiveBudget([], "nope", spent({}))).toEqual({ base: 0, carried: 0, total: 0 });
  });
});

describe("carryOut", () => {
  it("is the effective budget minus the period's own spending", () => {
    const periods = [period("p2", 10000, true), period("p1", 10000)];
    expect(carryOut(periods, "p2", spent({ p1: 8760, p2: 2000 }))).toBe(9240);
  });
});

describe("carryChain", () => {
  it("lists the earlier periods a carry depends on, nearest first", () => {
    const periods = [period("p3", 1, true), period("p2", 1, true), period("p1", 1)];
    expect(carryChain(periods, "p3")).toEqual(["p2", "p1"]);
  });

  it("is empty when the period doesn't carry over", () => {
    const periods = [period("p2", 1, false), period("p1", 1)];
    expect(carryChain(periods, "p2")).toEqual([]);
  });

  it("is empty for the oldest period even if flagged", () => {
    expect(carryChain([period("p1", 1, true)], "p1")).toEqual([]);
  });
});

describe("describeCarry", () => {
  it("uses the same neutral shape both ways", () => {
    expect(describeCarry(1240, formatPHP)).toBe(`+${formatPHP(1240)} from last period`);
    expect(describeCarry(-3000, formatPHP)).toBe(`−${formatPHP(3000)} from last period`);
  });
});
