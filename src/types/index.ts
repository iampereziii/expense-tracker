import type { Timestamp } from "firebase/firestore";

/** households/{householdId} */
export interface Household {
  id: string;
  name?: string;
  /** Fixed "PHP" at MVP. */
  currency: string;
  createdAt: Timestamp;
}

/** households/{householdId}/categories/{categoryId} */
export interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  /** Soft-remove. Archived categories drop off the input row but still
   *  resolve for historical expenses. Never hard-deleted while referenced. */
  archived: boolean;
  createdAt: Timestamp;
}

/** households/{householdId}/periods/{periodId} */
export interface Period {
  id: string;
  /** Set when declared (defaults to now). */
  startDate: Timestamp;
  /** null = open/active; set when the next period is declared. */
  endDate: Timestamp | null;
  budgetAmount: number;
  /** Numeric income declared for this period. Optional — legacy periods have none,
   *  and no income means no savings allocation fires. */
  incomeAmount?: number | null;
  /** Free-text breakdown alongside `incomeAmount`. */
  incomeNote?: string | null;
  createdAt: Timestamp;
}

/** Where the household holds money. Investment balances move with the market,
 *  so only `bank` accounts feed the unaccounted-gap math. */
export type AccountType = "bank" | "investment";

/** households/{householdId}/accounts/{accountId} */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Live balance in PHP — editable anytime, frozen into a snapshot at each cutoff. */
  balance: number;
  /** Soft-remove, same rationale as categories: snapshots reference accounts by id. */
  archived: boolean;
  /** Audit for last-write-wins reconciliation across the two devices. */
  declaredAt?: Timestamp | null;
  declaredBy?: string | null;
  createdAt: Timestamp;
}

/** households/{householdId}/periods/{periodId}/balances/{accountId}
 *  A frozen copy of one account's balance at the moment this period was declared.
 *  Name and type are denormalized so a renamed/archived account can't rewrite history. */
export interface BalanceSnapshot {
  /** Document id == accountId. */
  id: string;
  accountId: string;
  name: string;
  type: AccountType;
  balance: number;
  declaredAt: Timestamp | null;
  declaredBy: string | null;
}

/** households/{householdId}/savingsPots/{potId} */
export interface SavingsPot {
  id: string;
  name: string;
  /** 0–100. null/absent = manual pot with no rule. At most one rule per pot. */
  incomePercent?: number | null;
  archived: boolean;
  createdAt: Timestamp;
}

/** `income` = auto-applied percentage rule; `manual` = user add/withdraw/move. */
export type AllocationKind = "income" | "manual";

/** households/{householdId}/allocations/{allocationId}
 *  The pot ledger — pot balances are summed from this, never stored on the pot.
 *  Income allocations use the deterministic id `{periodId}_{potId}` so two offline
 *  devices declaring the same period collapse into one entry instead of double-counting. */
export interface Allocation {
  id: string;
  potId: string;
  /** Signed PHP delta applied to the pot. */
  amount: number;
  kind: AllocationKind;
  /** Set for income allocations; null for manual entries. */
  periodId?: string | null;
  /** Shared by both legs of a move-between-pots so the pair stays traceable. */
  transferId?: string | null;
  note?: string | null;
  createdAt: Timestamp | null;
  createdBy?: string | null;
}

/** households/{householdId}/periods/{periodId}/expenses/{expenseId} */
export interface Expense {
  id: string;
  /** Defaults to today; editable. */
  date: Timestamp;
  /** PHP, numeric only, > 0. */
  amount: number;
  categoryId: string;
  note?: string | null;
  createdAt: Timestamp;
}

/** A new expense, before Firestore assigns id/createdAt. */
export interface NewExpense {
  amount: number;
  categoryId: string;
  date?: Date;
  note?: string;
}
