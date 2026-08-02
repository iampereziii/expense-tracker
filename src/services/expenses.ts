import {
  collection,
  doc,
  query,
  orderBy,
  setDoc,
  deleteDoc,
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
 * Log an expense against the active period (Rule 2).
 *
 * Deliberately NOT async (see original rationale — offline writes must not
 * block). Uses a pre-generated ref + setDoc instead of addDoc so the caller
 * gets the id back synchronously; the undo path needs it before the network
 * ever answers.
 */
export function addExpense(
  periodId: string,
  expense: NewExpense,
  onError?: (error: unknown) => void,
): string {
  const ref = doc(expensesCol(periodId));
  void setDoc(ref, {
    amount: expense.amount,
    categoryId: expense.categoryId,
    date: expense.date ? Timestamp.fromDate(expense.date) : serverTimestamp(),
    note: expense.note?.trim() ?? null,
    createdAt: serverTimestamp(),
  }).catch((error: unknown) => {
    onError?.(error);
  });
  return ref.id;
}

/**
 * Undo a just-logged expense. Hard delete is safe here — nothing references an
 * expense doc (the archive requirement covers categories/accounts/pots, which
 * ARE referenced). Same fire-and-forget contract as addExpense.
 */
export function deleteExpense(
  periodId: string,
  expenseId: string,
  onError?: (error: unknown) => void,
): void {
  void deleteDoc(doc(expensesCol(periodId), expenseId)).catch((error: unknown) => {
    onError?.(error);
  });
}
