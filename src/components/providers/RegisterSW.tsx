"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker for offline install. */
export function RegisterSW(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    // `updateViaCache: "none"` makes the browser fetch sw.js from the network
    // rather than its own HTTP cache, so a bumped CACHE version actually reaches
    // an already-installed device instead of being masked by a cached worker.
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      /* registration failure is non-fatal */
    });
  }, []);
  return null;
}
