import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  allocationForIncome,
  allocationId,
  derivedSavingsMain,
  normalizePercent,
  plannedAllocations,
  potBalances,
  sumPotBalances,
} from "@/lib/savings";
import type { Allocation, SavingsPot } from "@/types";

function pot(id: string, incomePercent: number | null, archived = false): SavingsPot {
  return { id, name: id, incomePercent, archived, createdAt: Timestamp.fromMillis(0) };
}

function entry(potId: string, amount: number): Pick<Allocation, "potId" | "amount"> {
  return { potId, amount };
}

describe("allocationForIncome", () => {
  it("takes the pot's percentage of income", () => {
    expect(allocationForIncome(30_000, 5)).toBe(1_500);
  });

  it("rounds to whole centavos", () => {
    expect(allocationForIncome(33_333, 5)).toBe(1_666.65);
  });

  it("allocates nothing without income or without a rule", () => {
    expect(allocationForIncome(0, 5)).toBe(0);
    expect(allocationForIncome(30_000, null)).toBe(0);
    expect(allocationForIncome(30_000, undefined)).toBe(0);
    expect(allocationForIncome(30_000, 0)).toBe(0);
    expect(allocationForIncome(Number.NaN, 5)).toBe(0);
  });
});

describe("normalizePercent", () => {
  it("keeps a valid percentage and clamps above 100", () => {
    expect(normalizePercent(5)).toBe(5);
    expect(normalizePercent(250)).toBe(100);
  });

  it("treats blank, zero and negative as no rule", () => {
    expect(normalizePercent(null)).toBeNull();
    expect(normalizePercent(0)).toBeNull();
    expect(normalizePercent(-5)).toBeNull();
    expect(normalizePercent(Number.NaN)).toBeNull();
  });
});

describe("potBalances", () => {
  it("derives each pot's balance from the ledger", () => {
    const balances = potBalances([
      entry("groceries", 1_500),
      entry("groceries", 500),
      entry("travel", 2_000),
      entry("groceries", -400),
    ]);
    expect(balances).toEqual({ groceries: 1_600, travel: 2_000 });
  });

  it("allows a pot to be drawn negative rather than blocking the write", () => {
    expect(potBalances([entry("travel", 100), entry("travel", -500)])).toEqual({
      travel: -400,
    });
  });

  it("does not drift across many centavo entries", () => {
    const ledger = Array.from({ length: 10 }, () => entry("p", 0.1));
    expect(potBalances(ledger).p).toBe(1);
  });
});

describe("sumPotBalances / derivedSavingsMain", () => {
  it("leaves total savings constant — pots only organize it", () => {
    const bankTotal = 100_000;
    const balances = { groceries: 1_600, travel: 2_000 };
    const potTotal = sumPotBalances(balances);
    expect(potTotal).toBe(3_600);
    expect(derivedSavingsMain(bankTotal, potTotal) + potTotal).toBe(bankTotal);
  });

  it("goes negative when pots claim more than the banks hold", () => {
    expect(derivedSavingsMain(1_000, 2_500)).toBe(-1_500);
  });
});

describe("allocationId", () => {
  it("is deterministic per period+pot so concurrent writes collapse into one", () => {
    expect(allocationId("period-1", "pot-a")).toBe("period-1_pot-a");
    expect(allocationId("period-1", "pot-a")).toBe(allocationId("period-1", "pot-a"));
    expect(allocationId("period-2", "pot-a")).not.toBe(allocationId("period-1", "pot-a"));
  });
});

describe("ledger idempotency", () => {
  it("credits a pot once when the same period's allocation is written twice", () => {
    // Firestore set() on a deterministic id overwrites rather than appends, so a retried
    // declaration collapses into one ledger row. Modelled here as a keyed map.
    const ledger = new Map<string, Pick<Allocation, "potId" | "amount">>();
    const write = (periodId: string, potId: string, amount: number) =>
      ledger.set(allocationId(periodId, potId), entry(potId, amount));

    write("period-1", "travel", 1_500);
    write("period-1", "travel", 1_500); // replayed commit
    expect(potBalances([...ledger.values()])).toEqual({ travel: 1_500 });

    // A genuinely later period is a separate row and does accumulate.
    write("period-2", "travel", 1_500);
    expect(potBalances([...ledger.values()])).toEqual({ travel: 3_000 });
  });
});

describe("plannedAllocations", () => {
  const pots = [pot("a", 5), pot("b", null), pot("c", 10), pot("d", 20, true)];

  it("previews only pots with a rule, skipping manual and archived ones", () => {
    expect(plannedAllocations(pots, 30_000)).toEqual([
      { pot: pots[0], amount: 1_500 },
      { pot: pots[2], amount: 3_000 },
    ]);
  });

  it("plans nothing for a period declared without income", () => {
    expect(plannedAllocations(pots, 0)).toEqual([]);
  });
});
