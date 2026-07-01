"use client";

import { useQueryData } from "./useQueryData";
import { activePeriodQuery } from "@/services/periods";
import type { Period } from "@/types";

/** The single open budget period (or null if none declared yet). */
export function useActivePeriod(enabled: boolean): { period: Period | null; loading: boolean } {
  const { data, loading } = useQueryData<Period>(
    () => (enabled ? activePeriodQuery() : null),
    [enabled],
  );
  return { period: data[0] ?? null, loading };
}
