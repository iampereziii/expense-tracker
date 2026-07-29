import { roundCentavos } from "./money";
import type { Allocation, SavingsPot } from "@/types";

/**
 * Deterministic ledger id for a percentage allocation. Two devices declaring the
 * same period offline write the *same* document id, so the writes collapse into one
 * entry on sync instead of double-crediting the pot.
 */
export function allocationId(periodId: string, potId: string): string {
  return `${periodId}_${potId}`;
}

/** How much a pot's percentage rule takes from a period's income. 0 = no allocation. */
export function allocationForIncome(
  incomeAmount: number,
  percent: number | null | undefined,
): number {
  if (!Number.isFinite(incomeAmount) || incomeAmount <= 0) return 0;
  if (percent == null || !Number.isFinite(percent) || percent <= 0) return 0;
  return roundCentavos((incomeAmount * percent) / 100);
}

/** Clamp a typed percentage into the 0–100 range; null for "no rule". */
export function normalizePercent(percent: number | null | undefined): number | null {
  if (percent == null || !Number.isFinite(percent) || percent <= 0) return null;
  return Math.min(100, roundCentavos(percent));
}

/** Pot balances derived from the ledger — never stored on the pot, so they can't drift. */
export function potBalances(
  allocations: ReadonlyArray<Pick<Allocation, "potId" | "amount">>,
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const entry of allocations) {
    const amount = Number.isFinite(entry.amount) ? entry.amount : 0;
    balances[entry.potId] = roundCentavos((balances[entry.potId] ?? 0) + amount);
  }
  return balances;
}

/** Total imaginary money parked in pots. */
export function sumPotBalances(balances: Record<string, number>): number {
  return roundCentavos(Object.values(balances).reduce((sum, value) => sum + value, 0));
}

/**
 * "Savings main" is derived, not stored: the declared bank total minus everything
 * allocated to pots. Total savings therefore stays constant — pots only organize it.
 * Negative is allowed and meaningful: the household has over-allocated.
 */
export function derivedSavingsMain(bankTotal: number, potTotal: number): number {
  return roundCentavos(bankTotal - potTotal);
}

/** Percentage allocations a declaration would apply, for previewing before the write. */
export function plannedAllocations(
  pots: ReadonlyArray<SavingsPot>,
  incomeAmount: number,
): Array<{ pot: SavingsPot; amount: number }> {
  return pots
    .filter((pot) => !pot.archived)
    .map((pot) => ({ pot, amount: allocationForIncome(incomeAmount, pot.incomePercent) }))
    .filter((planned) => planned.amount > 0);
}
