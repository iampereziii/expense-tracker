import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type Query,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";

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

/**
 * Declare a new budget period (Rule 3): close any open period, then open a
 * fresh one with the declared budget. Returns the new period id.
 */
export async function declarePeriod(
  budgetAmount: number,
  incomeNote?: string,
): Promise<string> {
  // Close the currently-open period, if any.
  const openSnap = await getDocs(activePeriodQuery());
  const now = Timestamp.now();
  await Promise.all(
    openSnap.docs.map((d) => updateDoc(doc(periodsCol(), d.id), { endDate: now })),
  );

  const ref = await addDoc(periodsCol(), {
    startDate: serverTimestamp(),
    endDate: null,
    budgetAmount,
    incomeNote: incomeNote?.trim() ?? null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
