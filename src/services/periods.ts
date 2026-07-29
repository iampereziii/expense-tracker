import {
  collection,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type Query,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";
import { roundCentavos } from "@/lib/money";
import { stageAccountBalance } from "./accounts";
import { stageBalanceSnapshots, type SnapshotInput } from "./balances";
import { stageIncomeAllocations } from "./savings";
import type { SavingsPot } from "@/types";

function periodsCol(): CollectionReference {
  return collection(getDb(), "households", HOUSEHOLD_ID, "periods");
}

/** The single active period = newest period whose endDate is null. */
export function activePeriodQuery(): Query {
  return query(
    periodsCol(),
    where("endDate", "==", null),
    orderBy("startDate", "desc"),
    limit(1),
  );
}

/** All periods, newest first, for history/report. */
export function allPeriodsQuery(): Query {
  return query(periodsCol(), orderBy("startDate", "desc"));
}

/** Everything one cutoff records. Balances and pots are optional — declaring a period
 *  with neither must keep working, or the cutoff routine gains friction and dies. */
export interface PeriodDeclaration {
  budgetAmount: number;
  /** Numeric income for the new period. Absent/zero = no savings allocations fire. */
  incomeAmount?: number | null;
  /** Free-text breakdown alongside the number. */
  incomeNote?: string;
  /** Live balances, reviewed at the cutoff, to freeze as this period's snapshot. */
  balances?: ReadonlyArray<SnapshotInput>;
  /** Pots whose percentage rules apply to `incomeAmount`. */
  pots?: ReadonlyArray<SavingsPot>;
  /** Device uid for the balance audit fields. */
  uid?: string | null;
}

/** Only positive, finite income counts — anything else means "no income declared". */
function normalizeIncome(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return roundCentavos(value);
}

/**
 * Declare a new budget period (Rule 3): close any open period, then open a fresh one.
 *
 * Everything the cutoff records — the period doc, the frozen balance snapshot, the live
 * balance corrections, and the pots' percentage allocations — commits as one batch, so a
 * declaration can never land half-applied. The new id is generated client-side, so the
 * whole thing succeeds offline with no network on the write path.
 */
export async function declarePeriod(declaration: PeriodDeclaration): Promise<string> {
  const openSnap = await getDocs(activePeriodQuery());
  const now = Timestamp.now();
  const incomeAmount = normalizeIncome(declaration.incomeAmount);
  const uid = declaration.uid ?? null;

  const batch = writeBatch(getDb());

  // Close the currently-open period, if any.
  for (const openDoc of openSnap.docs) {
    batch.update(doc(periodsCol(), openDoc.id), { endDate: now });
  }

  const periodRef = doc(periodsCol());
  batch.set(periodRef, {
    startDate: serverTimestamp(),
    endDate: null,
    budgetAmount: declaration.budgetAmount,
    incomeAmount,
    incomeNote: declaration.incomeNote?.trim() ? declaration.incomeNote.trim() : null,
    createdAt: serverTimestamp(),
  });

  const balances = declaration.balances ?? [];
  stageBalanceSnapshots(batch, periodRef.id, balances, uid);
  // A balance adjusted during review becomes the new live balance too, else the
  // correction would only exist inside the snapshot and /accounts would show stale money.
  for (const entry of balances) {
    if (roundCentavos(entry.balance) !== roundCentavos(entry.liveBalance)) {
      stageAccountBalance(batch, entry.accountId, entry.balance, uid);
    }
  }

  stageIncomeAllocations(batch, periodRef.id, declaration.pots ?? [], incomeAmount ?? 0, uid);

  await batch.commit();
  return periodRef.id;
}
