/** Called if the server later rejects a write that already landed in the local cache. */
export type WriteErrorHandler = (error: unknown) => void;

/**
 * Start a Firestore write without waiting for it. The write lands in the local
 * cache synchronously and every onSnapshot listener re-renders from that, so
 * there is nothing for the UI to wait on — and awaiting it would block until
 * the server acknowledges, which offline is never. Same contract as addExpense.
 */
export function fireAndForget(write: Promise<void>, onError?: WriteErrorHandler): void {
  void write.catch((error: unknown) => {
    onError?.(error);
  });
}
