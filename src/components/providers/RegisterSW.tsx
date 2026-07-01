"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker for offline install. */
export function RegisterSW(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration failure is non-fatal */
    });
  }, []);
  return null;
}
