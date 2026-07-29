import {
  collection,
  doc,
  query,
  orderBy,
  updateDoc,
  Timestamp,
  type CollectionReference,
  type Query,
  type WriteBatch,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";
import { roundCentavos } from "@/lib/money";
import type { AccountType } from "@/types";

function balancesCol(periodId: string): CollectionReference {
  return collection(
    getDb(),
    "households",
    HOUSEHOLD_ID,
    "periods",
    periodId,
    "balances",
  );
}

/** The frozen balances for one cutoff. */
export function periodBalancesQuery(periodId: string): Query {
  return query(balancesCol(periodId), orderBy("name", "asc"));
}

/** One account's balance as it should be frozen at a cutoff. */
export interface SnapshotInput {
  accountId: string;
  name: string;
  type: AccountType;
  /** The reviewed value to freeze. */
  balance: number;
  /** The account's live balance before review — if it differs, the live doc is updated too. */
  liveBalance: number;
}

/**
 * Stage the frozen copies for a cutoff. Document id == accountId, so re-declaring is
 * idempotent and the two devices can't create duplicate rows for one account.
 */
export function stageBalanceSnapshots(
  batch: WriteBatch,
  periodId: string,
  entries: ReadonlyArray<SnapshotInput>,
  uid: string | null,
): void {
  const declaredAt = Timestamp.now();
  for (const entry of entries) {
    batch.set(doc(balancesCol(periodId), entry.accountId), {
      accountId: entry.accountId,
      // Name and type are denormalized: renaming an account later must not rewrite history.
      name: entry.name,
      type: entry.type,
      balance: roundCentavos(entry.balance),
      declaredAt,
      declaredBy: uid,
    });
  }
}

/**
 * Correct a typo in a cutoff snapshot. Callers must only offer this for the newest
 * period (still open) — older snapshots are immutable so past reconciliations hold.
 */
export async function correctSnapshotBalance(
  periodId: string,
  accountId: string,
  balance: number,
  uid: string | null,
): Promise<void> {
  await updateDoc(doc(balancesCol(periodId), accountId), {
    balance: roundCentavos(balance),
    declaredAt: Timestamp.now(),
    declaredBy: uid,
  });
}
