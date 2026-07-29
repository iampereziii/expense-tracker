import { describe, it, expect } from "vitest";
import {
  computeAwareness,
  describeGap,
  sumBalances,
  ZERO_TOTALS,
} from "@/lib/awareness";

describe("sumBalances", () => {
  it("splits bank from investment and totals both", () => {
    expect(
      sumBalances([
        { type: "bank", balance: 100_000 },
        { type: "bank", balance: 12_000 },
        { type: "investment", balance: 50_000 },
      ]),
    ).toEqual({ bank: 112_000, investment: 50_000, total: 162_000 });
  });

  it("treats an empty or non-numeric set as zero rather than NaN", () => {
    expect(sumBalances([])).toEqual(ZERO_TOTALS);
    expect(sumBalances([{ type: "bank", balance: Number.NaN }])).toEqual(ZERO_TOTALS);
  });
});

describe("computeAwareness", () => {
  // The brief's worked example: earned 30k, savings 100k -> 112k, logged 15k expenses.
  it("reports the brief's unaccounted-spend example", () => {
    const result = computeAwareness({
      previous: { bank: 100_000, investment: 0, total: 100_000 },
      current: { bank: 112_000, investment: 0, total: 112_000 },
      incomeAmount: 30_000,
      loggedExpenses: 15_000,
    });
    expect(result.savingsChange).toBe(12_000);
    expect(result.expectedBank).toBe(115_000);
    // 3k left the bank without ever being logged.
    expect(result.gap).toBe(-3_000);
  });

  it("reports a positive gap when more money arrived than was declared", () => {
    const result = computeAwareness({
      previous: { bank: 10_000, investment: 0, total: 10_000 },
      current: { bank: 15_000, investment: 0, total: 15_000 },
      incomeAmount: 4_000,
      loggedExpenses: 0,
    });
    expect(result.gap).toBe(1_000);
  });

  it("keeps investment movement out of the gap math but inside savings change", () => {
    const result = computeAwareness({
      previous: { bank: 50_000, investment: 20_000, total: 70_000 },
      current: { bank: 50_000, investment: 26_000, total: 76_000 },
      incomeAmount: 0,
      loggedExpenses: 0,
    });
    // A 6k market gain must not read as 6k of mystery income.
    expect(result.gap).toBe(0);
    expect(result.investmentChange).toBe(6_000);
    expect(result.savingsChange).toBe(6_000);
  });

  it("reconciles cleanly when every peso is logged", () => {
    const result = computeAwareness({
      previous: { bank: 20_000, investment: 0, total: 20_000 },
      current: { bank: 22_500, investment: 0, total: 22_500 },
      incomeAmount: 10_000,
      loggedExpenses: 7_500,
    });
    expect(result.gap).toBe(0);
  });

  it("tolerates a missing income amount on legacy periods", () => {
    const result = computeAwareness({
      previous: { bank: 5_000, investment: 0, total: 5_000 },
      current: { bank: 4_000, investment: 0, total: 4_000 },
      incomeAmount: Number.NaN,
      loggedExpenses: 1_000,
    });
    expect(result.gap).toBe(0);
  });

  it("does not accumulate float drift across centavo balances", () => {
    const result = computeAwareness({
      previous: { bank: 0.1, investment: 0, total: 0.1 },
      current: { bank: 0.3, investment: 0, total: 0.3 },
      incomeAmount: 0.2,
      loggedExpenses: 0,
    });
    expect(result.gap).toBe(0);
  });
});

describe("describeGap", () => {
  it("words a shortfall as unlogged spending", () => {
    expect(describeGap(-3_000)).toBe("₱3,000.00 spent but not logged");
  });

  it("words a surplus as extra income", () => {
    expect(describeGap(1_500)).toBe("₱1,500.00 extra came in");
  });

  it("reports a clean reconciliation, including sub-centavo noise", () => {
    expect(describeGap(0)).toBe("Everything's accounted for");
    expect(describeGap(0.0001)).toBe("Everything's accounted for");
  });
});
