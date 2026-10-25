import { roundCentavos } from "./money";
import type { Period } from "@/types";

/**
 * Budget carry-over within the month (feature brief: budget carry-over within the
 * month). A period flagged `carryOver` inherits the previous period's remainder —
 * positive when it was underspent, negative when it was overspent.
 *
 * Only the flag is stored; the amount is derived here on every read (Rule 7), so an
 * expense that syncs into the previous period late — an offline device that hadn't
 * seen the cutoff yet — still lands in the figure instead of leaving it stale.
 */

export interface EffectiveBudget {
  /** The amount typed when the period was declared. */
  base: number;
  /** Signed remainder inherited from the previous period. 0 when not carrying over. */
  carried: number;
  /** base + carried — what the period actually has to spend. May be negative. */
  total: number;
}

/** Spent per period id. Missing ids count as nothing spent. */
export type SpentByPeriod = ReadonlyMap<string, number>;

const NONE: EffectiveBudget = { base: 0, carried: 0, total: 0 };

function finite(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Ids of the earlier periods whose spending feeds `periodId`'s budget, nearest first.
 * `periods` must be newest first (as `allPeriodsQuery` returns them). The chain walks
 * back while each link carries over, so a third period in one month sees the second's
 * effective remainder, which in turn includes the first's.
 */
export function carryChain(periods: ReadonlyArray<Period>, periodId: string): string[] {
  const chain: string[] = [];
  let index = periods.findIndex((p) => p.id === periodId);
  if (index < 0) return chain;
  while (periods[index]?.carryOver === true && periods[index + 1]) {
    chain.push(periods[index + 1]!.id);
    index += 1;
  }
  return chain;
}

/** What `periodId` has to spend, with the carry-over broken out. */
export function effectiveBudget(
  periods: ReadonlyArray<Period>,
  periodId: string,
  spent: SpentByPeriod,
): EffectiveBudget {
  const index = periods.findIndex((p) => p.id === periodId);
  const period = periods[index];
  if (!period) return NONE;

  const base = roundCentavos(finite(period.budgetAmount));
  const previous = periods[index + 1];
  // Absent flag = legacy period declared before carry-over existed = no carry.
  if (period.carryOver !== true || !previous) return { base, carried: 0, total: base };

  const carried = carryOut(periods, previous.id, spent);
  return { base, carried, total: roundCentavos(base + carried) };
}

/** What `periodId` would hand to the next period: its effective budget minus its spending. */
export function carryOut(
  periods: ReadonlyArray<Period>,
  periodId: string,
  spent: SpentByPeriod,
): number {
  const { total } = effectiveBudget(periods, periodId, spent);
  return roundCentavos(total - finite(spent.get(periodId)));
}

/** Neutral wording for the carried line — informs, never scolds (brief, Risks #3). */
export function describeCarry(carried: number, format: (n: number) => string): string {
  const rounded = roundCentavos(carried);
  const sign = rounded < 0 ? "−" : "+";
  return `${sign}${format(Math.abs(rounded))} from last period`;
}
