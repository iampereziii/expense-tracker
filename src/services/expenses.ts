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
 * Log an expense against the active period (Rule 2).
 *
 * Deliberately NOT async: a Firestore write promise resolves only when the
 * *server* acknowledges it, so awaiting it hangs indefinitely while offline —
 * the exact case this app exists for. The document enters the local cache
 * synchronously and the snapshot listener fires from cache immediately, so the
 * running total updates with no round trip; Firestore replays the write on
 * reconnect (Rule 5).
 *
 * Callers must not block the UI on this. `onError` reports a genuine rejection
 * (rules, malformed data) without putting the network on the write path — being
 * offline is not an error and will not call it.
 */
export function addExpense(
  periodId: string,
  expense: NewExpense,
  onError?: (error: unknown) => void,
): void {
  void addDoc(expensesCol(periodId), {
    amount: expense.amount,
    categoryId: expense.categoryId,
    date: expense.date ? Timestamp.fromDate(expense.date) : serverTimestamp(),
    note: expense.note?.trim() ?? null,
    createdAt: serverTimestamp(),
  }).catch((error: unknown) => {
    onError?.(error);
  });
}
