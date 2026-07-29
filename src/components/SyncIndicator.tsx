"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Subtle online/offline pill — never blocks input (NFR: error handling). */
export function SyncIndicator() {
  const online = useOnlineStatus();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        online ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? "bg-ok-fg" : "bg-warn-fg"}`}
      />
      {online ? "Synced" : "Offline — saved locally"}
    </span>
  );
}
