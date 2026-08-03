# Manual Sync Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tappable sync pill that forces a Firestore reconnect on demand, mounted on every page that displays household data.

**Architecture:** Upgrade the existing passive `SyncIndicator` `<span>` to an interactive `<button>` driven by a small local state machine. Tapping calls a new `forceResync` helper in `services/sync.ts` that runs `disableNetwork → enableNetwork → waitForPendingWrites` under a 4-second timeout — this tears down the WebSocket so active `onSnapshot` listeners re-fetch from the server on reconnect. Feedback lives inside the pill (`Syncing…`, `Up to date ✓`, `Still offline`); no new UI concept, no toast system.

**Tech Stack:** Next.js 14 (App Router, static export), TypeScript strict, Firebase v10 SDK, Tailwind CSS, Vitest (unit) + Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-08-03-manual-sync-control-design.md`

## Global Constraints

- TypeScript strict (`noUncheckedIndexedAccess`); no `any`. `npm run typecheck` must pass.
- All Firestore access via `src/services/*.ts`. Pages/components must not import from `firebase/firestore` directly (CLAUDE.md rule 3).
- Tailwind only — reuse existing tokens (`bg-ok-bg`, `text-ok-fg`, `bg-warn-bg`, `text-warn-fg`, `bg-surface-sunken`, `text-ink-muted`). No new dependencies.
- Mobile-first @375px, one-handed. Button tap target ≥ 44×44 (add sufficient padding).
- `npm test` (Vitest) and `npm run test:e2e` (Playwright) must pass. Playwright tests that require Firebase credentials gate on `hasFirebaseEnv` from `tests/e2e/_env.ts` — the manual sync tests need it since they exercise real network toggling.
- No new dependencies. Uses only the existing Firebase SDK + Tailwind.
- The ≤5s log loop on `/` must not regress. Nothing on the Log page moves; only the pill becomes tappable.

---

## File Structure

**Create:**
- `src/services/sync.ts` — exports `forceResync(db: Firestore): Promise<'synced' | 'offline'>`. Sequences `disableNetwork → enableNetwork → waitForPendingWrites` under a 4000ms cap. Only file in this feature that imports from `firebase/firestore`.
- `tests/unit/sync.test.ts` — Vitest tests for `forceResync`, mocking Firestore.
- `tests/e2e/manual-sync.spec.ts` — Playwright test for tap-in-online + tap-in-offline flows.

**Modify:**
- `src/components/SyncIndicator.tsx` — replace passive `<span>` with an interactive `<button>` implementing the five-state machine. Signature change: no props today, no props after.
- `src/app/periods/page.tsx` — mount `<SyncIndicator />` in the header row next to the `<h1>`.
- `src/app/accounts/page.tsx` — same.
- `src/app/savings/page.tsx` — same.

**Untouched by design:**
- `src/hooks/useOnlineStatus.ts` — still the source of truth for the *idle* pill color.
- `src/hooks/useQueryData.ts` — no changes; the reconnect trick relies on existing `onSnapshot` behavior.
- `src/app/page.tsx` — already renders `<SyncIndicator />`; the upgrade lands there transparently.

---

## Task 1: `services/sync.ts` with unit tests

**Files:**
- Create: `src/services/sync.ts`
- Create: `tests/unit/sync.test.ts`

**Interfaces:**
- Consumes: `Firestore` type from `firebase/firestore`; `disableNetwork`, `enableNetwork`, `waitForPendingWrites` functions from `firebase/firestore`.
- Produces: `forceResync(db: Firestore): Promise<'synced' | 'offline'>` — resolves `'synced'` if all three network ops finish within 4000ms; resolves `'offline'` on timeout or if any op throws. Never rejects.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/sync.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test -- sync`
Expected: FAIL — `Cannot find module '@/services/sync'` (or all four tests fail).

- [ ] **Step 3: Implement `services/sync.ts`**

Create `src/services/sync.ts`:

```ts
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
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test -- sync`
Expected: PASS — all four tests green.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/sync.ts tests/unit/sync.test.ts
git commit -m "feat(sync): add forceResync — reconnect + flush under a 4s cap"
```

---

## Task 2: Upgrade `SyncIndicator` to interactive button

**Files:**
- Modify: `src/components/SyncIndicator.tsx` (full rewrite — small file)

**Interfaces:**
- Consumes: `forceResync` from `@/services/sync`; `getDb` from `@/lib/firebase`; `useOnlineStatus` from `@/hooks/useOnlineStatus`.
- Produces: `<SyncIndicator />` — same import path, no props, tappable. Existing callers on `/`, and new callers in Task 3, work unchanged.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/SyncIndicator.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Run existing unit tests**

Run: `npm test`
Expected: PASS — no unit tests exercise the component; sync tests from Task 1 still pass.

- [ ] **Step 4: Sanity-check the existing offline E2E still passes**

Existing test `tests/e2e/offline-log.spec.ts` asserts `getByText("Offline — saved locally")` and `getByText("Synced")`. Those strings are unchanged in the new component and `getByText` matches both `<span>` and `<button>`, so the test should still pass.

Run: `npm run test:e2e -- offline-log`
Expected: PASS (or SKIP if `hasFirebaseEnv` is false — same as before).

- [ ] **Step 5: Manual smoke — start dev server and tap the pill**

Run: `npm run dev`
Open http://localhost:3000/, tap the pill in the header. Confirm:
- Pill shows `Syncing…` briefly
- Then `Up to date ✓` for ~1.5s
- Then returns to `Synced`

Then in DevTools set Network to Offline, tap the pill, confirm `Still offline` flashes and returns to `Offline — saved locally`.

- [ ] **Step 6: Commit**

```bash
git add src/components/SyncIndicator.tsx
git commit -m "feat(ui): make SyncIndicator tappable — forces a resync on tap"
```

---

## Task 3: Mount pill on Periods, Accounts, Savings

**Files:**
- Modify: `src/app/periods/page.tsx` — add pill to header row.
- Modify: `src/app/accounts/page.tsx` — add pill to header row.
- Modify: `src/app/savings/page.tsx` — add pill to header row.

**Interfaces:**
- Consumes: `<SyncIndicator />` from `@/components/SyncIndicator` (built in Task 2).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Modify `src/app/periods/page.tsx`**

Add the import at the top of the imports block:

```tsx
import { SyncIndicator } from "@/components/SyncIndicator";
```

Replace the existing `<h1>` line:

```tsx
      <h1 className="text-lg font-semibold">Budget periods</h1>
```

with a header row that keeps the title on the left and puts the pill on the right:

```tsx
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Budget periods</h1>
        <SyncIndicator />
      </div>
```

- [ ] **Step 2: Modify `src/app/accounts/page.tsx`**

Add the same import. Read the file to find its `<h1>` (accounts page has its own title copy), then wrap it in the identical `flex items-center justify-between gap-2` div with `<SyncIndicator />` after the `<h1>`. Do not change the title text or any other page content.

- [ ] **Step 3: Modify `src/app/savings/page.tsx`**

Same pattern — add import, wrap the existing `<h1>` in the flex row with `<SyncIndicator />` after it. Do not change the title text or any other page content.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual smoke — visit each page and confirm pill placement**

Run: `npm run dev`
Visit `/periods`, `/accounts`, `/savings`. Confirm:
- Pill sits at the top-right of the page header, aligned with the title
- At 375px width, header row doesn't wrap; title truncates gracefully if pill runs long
- Tapping the pill on any of these pages shows `Syncing…ⁿ` → `Up to date ✓` → back to `Synced`

- [ ] **Step 6: Commit**

```bash
git add src/app/periods/page.tsx src/app/accounts/page.tsx src/app/savings/page.tsx
git commit -m "feat(ui): mount SyncIndicator on Periods, Accounts, Savings headers"
```

---

## Task 4: E2E test — manual sync tap flow

**Files:**
- Create: `tests/e2e/manual-sync.spec.ts`

**Interfaces:**
- Consumes: `LOG_BUDGET_MS`, `firebaseSkipReason`, `hasFirebaseEnv` from `./_env` (existing test env helpers).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/manual-sync.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

/**
 * Verifies the manual sync control (spec:
 * docs/superpowers/specs/2026-08-03-manual-sync-control-design.md).
 *
 * Tests the mechanism (tap → transient state → return to idle), not the
 * cross-device staleness scenario — that's outside Playwright's scope.
 */
test.describe("manual sync control", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("shows 'Up to date ✓' after a successful sync on the Log page", async ({ page }) => {
    await page.goto("/");
    const pill = page.getByRole("button", { name: /Synced|Offline/ });
    await expect(pill).toBeVisible();

    await pill.click();
    // Transient success flash — assert within the 1.5s window.
    await expect(page.getByRole("button", { name: "Up to date ✓" })).toBeVisible();
    // Then back to Synced.
    await expect(page.getByRole("button", { name: "Synced" })).toBeVisible({
      timeout: 3000,
    });
  });

  test("shows 'Still offline' when tapped while offline", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await expect(page.getByRole("button", { name: "Offline — saved locally" })).toBeVisible();

    await page.getByRole("button", { name: "Offline — saved locally" }).click();
    await expect(page.getByRole("button", { name: "Still offline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Offline — saved locally" })).toBeVisible({
      timeout: 3000,
    });

    await context.setOffline(false);
  });

  test("pill appears on Periods, Accounts, and Savings headers", async ({ page }) => {
    for (const path of ["/periods", "/accounts", "/savings"]) {
      await page.goto(path);
      await expect(
        page.getByRole("button", { name: /Synced|Offline/ }),
      ).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run the test — verify all three pass**

Run: `npm run test:e2e -- manual-sync`
Expected: PASS (or SKIP with `firebaseSkipReason` if credentials are absent — same gating as other E2E tests).

- [ ] **Step 3: Run the full E2E suite to confirm no regressions**

Run: `npm run test:e2e`
Expected: PASS — existing `offline-log`, `input-loop`, etc. all still green.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/manual-sync.spec.ts
git commit -m "test(e2e): cover manual sync tap flow (online, offline, placement)"
```

---

## Self-Review Notes

**Spec coverage check:**
- Section 1 (control is a button, five pages) → Task 2 (button) + Task 3 (three added pages) + `/` already renders it.
- Section 2 (five states, copy, colors) → Task 2 `viewFor` function.
- Section 3 (`forceResync` sequence, 4s cap, in `services/sync.ts`) → Task 1.
- Section 4 (placement: header top-right) → Task 3.
- Section 5 (unit tests for services/sync, E2E for pill) → Task 1 (unit) + Task 4 (E2E). Component unit tests explicitly dropped from spec since the codebase's convention is E2E-only for components — documented in this plan header.
- Section 6 (exclusions) → nothing in the plan touches pull-to-refresh, toasts, per-query refresh, the input loop, or `useQueryData`.

**Type consistency check:**
- `forceResync(db: Firestore): Promise<'synced' | 'offline'>` — same signature in spec, Task 1 test, Task 1 impl, and Task 2 caller.
- `Phase` type in the component is internal — never crosses a task boundary.

**Placeholder scan:** none — every step has runnable commands or complete code.
