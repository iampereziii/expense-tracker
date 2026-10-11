import {
  collection,
  query,
  where,
  orderBy,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type Query,
  type WriteBatch,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";
import { roundCentavos } from "@/lib/money";
import type { AccountType } from "@/types";
import { fireAndForget, type WriteErrorHandler } from "./write";

function accountsCol(): CollectionReference {
  return collection(getDb(), "households", HOUSEHOLD_ID, "accounts");
}

/** Active accounts for the balance flows, oldest first. */
export function activeAccountsQuery(): Query {
  return query(accountsCol(), where("archived", "==", false), orderBy("createdAt", "asc"));
}

/** Not awaited (see fireAndForget) — the row appears from the local cache at once. */
export function addAccount(name: string, type: AccountType, onError?: WriteErrorHandler): string {
  const ref = doc(accountsCol());
  fireAndForget(
    setDoc(ref, {
      name: name.trim(),
      type,
      balance: 0,
      archived: false,
      declaredAt: null,
      declaredBy: null,
      createdAt: serverTimestamp(),
    }),
    onError,
  );
  return ref.id;
}

export function renameAccount(id: string, name: string, onError?: WriteErrorHandler): void {
  fireAndForget(updateDoc(doc(accountsCol(), id), { name: name.trim() }), onError);
}

/**
 * Update the live balance. Editable anytime — whatever it holds when the next period
 * is declared becomes that cutoff's frozen snapshot. `declaredAt`/`declaredBy` make a
 * last-write-wins clobber between the two devices explainable after the fact.
 */
export function setAccountBalance(
  id: string,
  balance: number,
  uid: string | null,
  onError?: WriteErrorHandler,
): void {
  fireAndForget(updateDoc(doc(accountsCol(), id), balanceUpdate(balance, uid)), onError);
}

/** Same write, staged into the declaration batch so a reviewed adjustment isn't lost. */
export function stageAccountBalance(
  batch: WriteBatch,
  id: string,
  balance: number,
  uid: string | null,
): void {
  batch.update(doc(accountsCol(), id), balanceUpdate(balance, uid));
}

function balanceUpdate(balance: number, uid: string | null) {
  return {
    balance: roundCentavos(balance),
    // Client clock, not serverTimestamp: the audit value must be readable offline.
    declaredAt: Timestamp.now(),
    declaredBy: uid,
  };
}

/** Soft-remove (Rule 7): drops out of the balance flows, historical snapshots survive. */
export function archiveAccount(id: string, onError?: WriteErrorHandler): void {
  fireAndForget(updateDoc(doc(accountsCol(), id), { archived: true }), onError);
}
