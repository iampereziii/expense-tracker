"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Subtle online/offline pill — never blocks input (NFR: error handling). */
export function SyncIndicator() {
  const online = useOnlineStatus();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        online ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}
      />
      {online ? "Synced" : "Offline — saved locally"}
    </span>
  );
}
