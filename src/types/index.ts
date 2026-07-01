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
  incomeNote?: string | null;
  createdAt: Timestamp;
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
