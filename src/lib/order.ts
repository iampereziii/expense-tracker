/** Anything with a Firestore-style creation time; null while a serverTimestamp is pending. */
interface HasCreatedAt {
  createdAt?: { toMillis(): number } | null;
}

/**
 * Oldest first, with just-created items (pending server timestamp → null) last.
 *
 * Done on the client instead of `orderBy("createdAt")` because combining that with
 * `where("archived", "==", false)` needs a composite index. Without the index the
 * server rejects the listener, it stops silently, and the list only refreshes on a
 * reload. These lists are a handful of docs, so sorting here costs nothing.
 *
 * Read pending timestamps with `serverTimestamps: "estimate"` so a just-added item
 * gets its local write time. The estimate is whole seconds, so two items added in
 * the same second tie and keep snapshot order — the same as orderBy did.
 */
export function sortByCreatedAt<T extends HasCreatedAt>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const am = a.createdAt?.toMillis();
    const bm = b.createdAt?.toMillis();
    if (am === undefined && bm === undefined) return 0;
    if (am === undefined) return 1;
    if (bm === undefined) return -1;
    return am - bm;
  });
}
