import { formatPHP, roundCentavos } from "./money";
import type { AccountType } from "@/types";

/** Balances split by account type — investments are reported separately because a
 *  market swing is not spending (account-balance brief, Risk #2). */
export interface BalanceTotals {
  bank: number;
  investment: number;
  total: number;
}

export const ZERO_TOTALS: BalanceTotals = { bank: 0, investment: 0, total: 0 };

/** Sum any list of balance-carrying rows (live accounts or frozen snapshots). */
export function sumBalances(
  entries: ReadonlyArray<{ type: AccountType; balance: number }>,
): BalanceTotals {
  let bank = 0;
  let investment = 0;
  for (const entry of entries) {
    const value = Number.isFinite(entry.balance) ? entry.balance : 0;
    if (entry.type === "investment") investment += value;
    else bank += value;
  }
  bank = roundCentavos(bank);
  investment = roundCentavos(investment);
  return { bank, investment, total: roundCentavos(bank + investment) };
}

export interface AwarenessInput {
  /** Balances frozen when the period being reviewed was declared. */
  previous: BalanceTotals;
  /** Balances frozen when the *next* period was declared — the closing cutoff. */
  current: BalanceTotals;
  incomeAmount: number;
  loggedExpenses: number;
}

export interface Awareness {
  bankChange: number;
  investmentChange: number;
  /** Bank + investment movement — what the household actually saved. */
  savingsChange: number;
  /** previousBank + income − loggedExpenses. */
  expectedBank: number;
  /** actualBank − expectedBank. Negative = money left that was never logged. */
  gap: number;
}

/**
 * The period-over-period reconciliation. Investments are excluded from the gap
 * math (only bank accounts feed it) and surfaced as their own change line.
 */
export function computeAwareness(input: AwarenessInput): Awareness {
  const income = Number.isFinite(input.incomeAmount) ? input.incomeAmount : 0;
  const expenses = Number.isFinite(input.loggedExpenses) ? input.loggedExpenses : 0;

  const bankChange = roundCentavos(input.current.bank - input.previous.bank);
  const investmentChange = roundCentavos(input.current.investment - input.previous.investment);
  const expectedBank = roundCentavos(input.previous.bank + income - expenses);

  return {
    bankChange,
    investmentChange,
    savingsChange: roundCentavos(bankChange + investmentChange),
    expectedBank,
    gap: roundCentavos(input.current.bank - expectedBank),
  };
}

/**
 * Sign-aware wording for the gap line. Informative, never scolding — the point is
 * awareness, not discouraging the logging habit.
 */
export function describeGap(gap: number): string {
  const rounded = roundCentavos(gap);
  if (rounded === 0) return "Everything's accounted for";
  if (rounded < 0) return `${formatPHP(-rounded)} spent but not logged`;
  return `${formatPHP(rounded)} extra came in`;
}
