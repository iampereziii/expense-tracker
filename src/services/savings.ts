import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type Query,
  type WriteBatch,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";
import { roundCentavos } from "@/lib/money";
import { allocationForIncome, allocationId, normalizePercent } from "@/lib/savings";
import type { SavingsPot } from "@/types";

function potsCol(): CollectionReference {
  return collection(getDb(), "households", HOUSEHOLD_ID, "savingsPots");
}

function allocationsCol(): CollectionReference {
  return collection(getDb(), "households", HOUSEHOLD_ID, "allocations");
}

/** Active pots, oldest first. */
export function activePotsQuery(): Query {
  return query(potsCol(), where("archived", "==", false), orderBy("createdAt", "asc"));
}

/** The whole ledger, newest first — pot balances are summed from this. */
export function allocationsQuery(): Query {
  return query(allocationsCol(), orderBy("createdAt", "desc"));
}

export async function addPot(name: string, incomePercent: number | null): Promise<void> {
  await addDoc(potsCol(), {
    name: name.trim(),
    incomePercent: normalizePercent(incomePercent),
    archived: false,
    createdAt: serverTimestamp(),
  });
}

export async function renamePot(id: string, name: string): Promise<void> {
  await updateDoc(doc(potsCol(), id), { name: name.trim() });
}

/** At most one rule per pot — null turns it back into a manual pot. */
export async function setPotPercent(id: string, incomePercent: number | null): Promise<void> {
  await updateDoc(doc(potsCol(), id), { incomePercent: normalizePercent(incomePercent) });
}

/** Soft-remove: the pot leaves the list but its ledger entries stay resolvable. */
export async function archivePot(id: string): Promise<void> {
  await updateDoc(doc(potsCol(), id), { archived: true });
}

/**
 * A user-initiated add (positive) or withdraw (negative) against a pot. Generated id —
 * unlike percentage allocations these are genuinely distinct events, so two devices
 * each adding ₱500 should produce two entries.
 */
export async function addPotEntry(
  potId: string,
  amount: number,
  note: string | null,
  uid: string | null,
): Promise<void> {
  await addDoc(allocationsCol(), {
    potId,
    amount: roundCentavos(amount),
    kind: "manual",
    periodId: null,
    transferId: null,
    note: note?.trim() ? note.trim() : null,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

/** Move imaginary money between pots as two ledger legs sharing a transferId. */
export async function movePotFunds(
  fromPotId: string,
  toPotId: string,
  amount: number,
  uid: string | null,
): Promise<void> {
  const value = roundCentavos(amount);
  if (value <= 0 || fromPotId === toPotId) return;

  const batch = writeBatch(getDb());
  const outRef = doc(allocationsCol());
  const inRef = doc(allocationsCol());
  const transferId = outRef.id;
  const createdAt = serverTimestamp();

  batch.set(outRef, {
    potId: fromPotId,
    amount: -value,
    kind: "manual",
    periodId: null,
    transferId,
    note: "Moved out",
    createdAt,
    createdBy: uid,
  });
  batch.set(inRef, {
    potId: toPotId,
    amount: value,
    kind: "manual",
    periodId: null,
    transferId,
    note: "Moved in",
    createdAt,
    createdBy: uid,
  });
  await batch.commit();
}

/**
 * Stage each pot's percentage rule against a period's income, as part of the period
 * declaration batch. Deterministic ids make the write idempotent, so declaring the same
 * period from both devices while offline converges instead of double-counting (Risk #1).
 * No income means no allocations at all.
 */
export function stageIncomeAllocations(
  batch: WriteBatch,
  periodId: string,
  pots: ReadonlyArray<SavingsPot>,
  incomeAmount: number,
  uid: string | null,
): void {
  if (!Number.isFinite(incomeAmount) || incomeAmount <= 0) return;
  const createdAt = Timestamp.now();

  for (const pot of pots) {
    if (pot.archived) continue;
    const amount = allocationForIncome(incomeAmount, pot.incomePercent);
    if (amount <= 0) continue;
    batch.set(doc(allocationsCol(), allocationId(periodId, pot.id)), {
      potId: pot.id,
      amount,
      kind: "income",
      periodId,
      transferId: null,
      note: `${pot.incomePercent}% of income`,
      createdAt,
      createdBy: uid,
    });
  }
}
