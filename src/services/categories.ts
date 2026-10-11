import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  type CollectionReference,
  type Query,
} from "firebase/firestore";
import { getDb, HOUSEHOLD_ID } from "@/lib/firebase";
import { SEED_CATEGORIES, DEFAULT_CATEGORY_COLOR } from "@/lib/constants";
import { fireAndForget, type WriteErrorHandler } from "./write";

function categoriesCol(): CollectionReference {
  return collection(getDb(), "households", HOUSEHOLD_ID, "categories");
}

/** Active (non-archived) categories for the input chip row, oldest first. */
export function activeCategoriesQuery(): Query {
  return query(
    categoriesCol(),
    where("archived", "==", false),
    orderBy("createdAt", "asc"),
  );
}

/**
 * Not awaited (see fireAndForget): the chip appears from the local cache at once,
 * online or off. Pre-generated ref so the caller gets the id synchronously.
 */
export function addCategory(
  name: string,
  color = DEFAULT_CATEGORY_COLOR,
  onError?: WriteErrorHandler,
): string {
  const ref = doc(categoriesCol());
  fireAndForget(
    setDoc(ref, {
      name: name.trim(),
      color,
      archived: false,
      createdAt: serverTimestamp(),
    }),
    onError,
  );
  return ref.id;
}

export function renameCategory(id: string, name: string, onError?: WriteErrorHandler): void {
  fireAndForget(updateDoc(doc(categoriesCol(), id), { name: name.trim() }), onError);
}

/** Soft-remove (Rule 7): hide from the input row but keep resolvable for history. */
export function archiveCategory(id: string, onError?: WriteErrorHandler): void {
  fireAndForget(updateDoc(doc(categoriesCol(), id), { archived: true }), onError);
}

/** Seed Food/Bills on first run if the household has no categories yet. */
export async function seedCategoriesIfEmpty(): Promise<void> {
  const snap = await getDocs(categoriesCol());
  if (!snap.empty) return;
  await Promise.all(
    SEED_CATEGORIES.map((c) =>
      addDoc(categoriesCol(), {
        name: c.name,
        color: c.color,
        archived: false,
        createdAt: serverTimestamp(),
      }),
    ),
  );
}

/**
 * Hard-delete — only safe when nothing references the category.
 * Callers must check usage first; archival is the default "remove".
 */
export async function hardDeleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(categoriesCol(), id));
}
