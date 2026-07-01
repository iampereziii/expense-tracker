import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type Query,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";
import type { NewExpense } from "@/types";

function expensesCol(periodId: string): CollectionReference {
  return collection(getDb(), "households", HOUSEHOLD_ID, "periods", periodId, "expenses");
}

/** Expenses for a period, newest first. */
export function expensesQuery(periodId: string): Query {
  return query(expensesCol(periodId), orderBy("date", "desc"));
}

/**
 * Log an expense against the active period (Rule 2). Succeeds instantly from
 * the local cache when offline; Firestore reconciles on reconnect (Rule 5).
 */
export async function addExpense(periodId: string, expense: NewExpense): Promise<void> {
  await addDoc(expensesCol(periodId), {
    amount: expense.amount,
    categoryId: expense.categoryId,
    date: expense.date ? Timestamp.fromDate(expense.date) : serverTimestamp(),
    note: expense.note?.trim() ?? null,
    createdAt: serverTimestamp(),
  });
}
