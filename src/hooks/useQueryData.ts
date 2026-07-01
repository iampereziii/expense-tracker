"use client";

import { useEffect, useState } from "react";
import { onSnapshot, type Query, type DocumentData } from "firebase/firestore";

/**
 * Subscribe to a Firestore query and return typed docs ({ id, ...data }).
 * Pass a factory that returns null to stay idle (e.g. before auth is ready).
 * Reads come from the local cache instantly and update live on sync.
 */
export function useQueryData<T>(
  makeQuery: () => Query | null,
  deps: ReadonlyArray<unknown>,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = makeQuery();
    if (!q) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as T[],
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
