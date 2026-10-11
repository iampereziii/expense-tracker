"use client";

import { useQueryData } from "./useQueryData";
import { allPeriodsQuery } from "@/services/periods";
import type { Period } from "@/types";

/** All budget periods, newest first (the open one, if any, comes first). */
export function usePeriods(enabled: boolean): { periods: Period[]; loading: boolean } {
  const { data, loading } = useQueryData<Period>(
    () => (enabled ? allPeriodsQuery() : null),
    [enabled],
  );
  return { periods: data, loading };
}
