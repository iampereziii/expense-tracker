import { describe, it, expect, vi } from "vitest";
import { fireAndForget } from "@/services/write";

describe("fireAndForget", () => {
  it("returns before the write settles, so the UI never waits on the server", () => {
    let settled = false;
    const pending = new Promise<void>((resolve) => setTimeout(() => ((settled = true), resolve()), 50));
    fireAndForget(pending);
    expect(settled).toBe(false);
  });

  it("reports a rejected write to onError instead of throwing", async () => {
    const onError = vi.fn();
    const failure = new Error("permission-denied");
    fireAndForget(Promise.reject(failure), onError);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it("swallows a rejection when no handler is given (no unhandled rejection)", async () => {
    fireAndForget(Promise.reject(new Error("offline")));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
