"use client";

import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { forceResync } from "@/services/sync";
import { getDb } from "@/lib/firebase";

type Phase = "idle" | "syncing" | "just-synced" | "still-offline";

const TRANSIENT_MS = 1500;

/**
 * Sync pill — reports online/offline state AND lets the user force a
 * reconnect on tap. Feedback lives inside the pill; transient states
 * auto-clear back to whatever useOnlineStatus currently says.
 */
export function SyncIndicator() {
  const online = useOnlineStatus();
  const [phase, setPhase] = useState<Phase>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleTap() {
    if (phase === "syncing") return;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPhase("syncing");
    const result = await forceResync(getDb());
    setPhase(result === "synced" ? "just-synced" : "still-offline");
    timerRef.current = setTimeout(() => {
      setPhase("idle");
      timerRef.current = null;
    }, TRANSIENT_MS);
  }

  const view = viewFor(phase, online);
  const busy = phase === "syncing";

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={busy}
      aria-busy={busy}
      aria-live="polite"
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none ${view.className} ${busy ? "cursor-wait" : "cursor-pointer"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${view.dotClass}`} aria-hidden />
      {view.label}
    </button>
  );
}

interface View {
  label: string;
  className: string;
  dotClass: string;
}

function viewFor(phase: Phase, online: boolean): View {
  if (phase === "syncing") {
    return {
      label: "Syncing…",
      className: "bg-surface-sunken text-ink-muted",
      dotClass: "bg-ink-muted animate-pulse",
    };
  }
  if (phase === "just-synced") {
    return {
      label: "Up to date ✓",
      className: "bg-ok-bg text-ok-fg",
      dotClass: "bg-ok-fg",
    };
  }
  if (phase === "still-offline") {
    return {
      label: "Still offline",
      className: "bg-warn-bg text-warn-fg",
      dotClass: "bg-warn-fg",
    };
  }
  // idle — derive from live online status.
  return online
    ? { label: "Synced", className: "bg-ok-bg text-ok-fg", dotClass: "bg-ok-fg" }
    : {
        label: "Offline — saved locally",
        className: "bg-warn-bg text-warn-fg",
        dotClass: "bg-warn-fg",
      };
}
