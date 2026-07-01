import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
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

export async function addCategory(name: string, color = DEFAULT_CATEGORY_COLOR): Promise<void> {
  await addDoc(categoriesCol(), {
    name: name.trim(),
    color,
    archived: false,
    createdAt: serverTimestamp(),
  });
}

export async function renameCategory(id: string, name: string): Promise<void> {
  await updateDoc(doc(categoriesCol(), id), { name: name.trim() });
}

/** Soft-remove (Rule 7): hide from the input row but keep resolvable for history. */
export async function archiveCategory(id: string): Promise<void> {
  await updateDoc(doc(categoriesCol(), id), { archived: true });
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
