import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Firestore module before importing the SUT.
const disableNetwork = vi.fn();
const enableNetwork = vi.fn();
const waitForPendingWrites = vi.fn();

vi.mock("firebase/firestore", () => ({
  disableNetwork: (...args: unknown[]) => disableNetwork(...args),
  enableNetwork: (...args: unknown[]) => enableNetwork(...args),
  waitForPendingWrites: (...args: unknown[]) => waitForPendingWrites(...args),
}));

import { forceResync } from "@/services/sync";

const fakeDb = {} as import("firebase/firestore").Firestore;

describe("forceResync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    disableNetwork.mockReset();
    enableNetwork.mockReset();
    waitForPendingWrites.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'synced' when all three network ops resolve, in order", async () => {
    const calls: string[] = [];
    disableNetwork.mockImplementation(async () => {
      calls.push("disable");
    });
    enableNetwork.mockImplementation(async () => {
      calls.push("enable");
    });
    waitForPendingWrites.mockImplementation(async () => {
      calls.push("wait");
    });

    const result = await forceResync(fakeDb);

    expect(result).toBe("synced");
    expect(calls).toEqual(["disable", "enable", "wait"]);
    expect(disableNetwork).toHaveBeenCalledWith(fakeDb);
    expect(enableNetwork).toHaveBeenCalledWith(fakeDb);
    expect(waitForPendingWrites).toHaveBeenCalledWith(fakeDb);
  });

  it("returns 'offline' when the sequence exceeds the 4000ms cap", async () => {
    disableNetwork.mockResolvedValue(undefined);
    // enableNetwork never resolves — simulates a hung reconnect.
    enableNetwork.mockImplementation(() => new Promise(() => {}));
    waitForPendingWrites.mockResolvedValue(undefined);

    const promise = forceResync(fakeDb);
    await vi.advanceTimersByTimeAsync(4000);

    await expect(promise).resolves.toBe("offline");
  });

  it("returns 'offline' when any op rejects", async () => {
    disableNetwork.mockResolvedValue(undefined);
    enableNetwork.mockRejectedValue(new Error("network error"));

    const result = await forceResync(fakeDb);

    expect(result).toBe("offline");
    // waitForPendingWrites should not run once enable fails.
    expect(waitForPendingWrites).not.toHaveBeenCalled();
  });

  it("never rejects, even on unexpected throw", async () => {
    disableNetwork.mockImplementation(() => {
      throw new Error("sync layer boom");
    });

    await expect(forceResync(fakeDb)).resolves.toBe("offline");
  });
});
