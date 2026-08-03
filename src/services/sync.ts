import {
  disableNetwork,
  enableNetwork,
  waitForPendingWrites,
  type Firestore,
} from "firebase/firestore";

const RESYNC_CAP_MS = 4000;

/**
 * Force a Firestore reconnect. Tears down the WebSocket then rebuilds it, so
 * every active `onSnapshot` listener re-fetches from the server on reconnect —
 * this is the mechanism that fixes the "data feels stale on the other device"
 * pain. Also waits for any queued offline writes to flush before declaring
 * success. Capped at 4s so the UI never gets stuck on a hung reconnect.
 *
 * Never rejects — resolves 'offline' on timeout or error. The caller reflects
 * that in the pill; there is no other error surface.
 */
export async function forceResync(db: Firestore): Promise<"synced" | "offline"> {
  const timeout = new Promise<"offline">((resolve) => {
    setTimeout(() => resolve("offline"), RESYNC_CAP_MS);
  });

  const attempt = (async (): Promise<"synced" | "offline"> => {
    try {
      await disableNetwork(db);
      await enableNetwork(db);
      await waitForPendingWrites(db);
      return "synced";
    } catch {
      return "offline";
    }
  })();

  return Promise.race([attempt, timeout]);
}
