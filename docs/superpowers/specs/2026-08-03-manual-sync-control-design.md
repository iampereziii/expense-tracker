# Design — Manual Sync Control

**Date:** 2026-08-03
**Status:** Approved in brainstorming — pending spec review
**Goal:** Give the user a visible, tactile way to force a Firestore refresh when data on the current device feels stale relative to the other household device, without weakening the offline-first architecture or slowing the ≤5s log loop.

---

## Problem

Two-device household. Partner A logs an expense on Phone A. Partner B opens Phone B a moment later — the new expense might not appear immediately if Phone B's `onSnapshot` listener has gone stale (backgrounded tab, dropped socket, cold PWA open). Firestore does reconcile automatically, but the user has no way to *force* it and no way to *confirm* it just happened. Today the `SyncIndicator` pill reports state (`Synced` / `Offline — saved locally`) but is not interactive, and it is only mounted on `/` (the Log page) — which is the page where staleness matters *least*.

## Decisions made during brainstorming

| Question | Decision |
|----------|----------|
| Which pain are we solving | "Data feels stale on the other device" — force fresh reads, not flush writes |
| Trigger form factor | Tappable pill (upgrade `SyncIndicator`), not pull-to-refresh |
| Behavior when offline | Pill stays tappable; attempts a reconnect anyway (handles OS misreport) |
| Behavior on Log page | Interactive everywhere — one component, one behavior |
| Success feedback | Brief `Up to date ✓` flash inside the pill (~1.5s), then back to `Synced` |

## Trends / options deliberately rejected

- **Pull-to-refresh** — fiddly in a PWA (iOS Safari overscroll bounce fights it), needs custom impl per page, only works when the page is scrollable, and the app's primary loop is input, not browsing. May revisit later if the button proves insufficient; for MVP it is out.
- **Toast system** — adds a new UI concept for one job. The pill is the whole feedback surface.
- **Per-query granularity** (`getDocsFromServer` per hook) — mismatches the mental model of "give me everything current." Global reconnect matches user intent and is simpler.
- **Server-writing a sync trigger doc** — no. The client SDK reconnect is the mechanism.

---

## Section 1 — The control

Upgrade `src/components/SyncIndicator.tsx` from a passive `<span>` to an interactive `<button>` with `type="button"` and `aria-live="polite"` so state transitions are announced by screen readers. Same visual footprint as today (rounded pill, small dot + label). Rendered on every page that displays household data: `/`, `/periods`, `/accounts`, `/savings`.

## Section 2 — States and copy

Five states, all rendered inside the same pill:

| State | Copy | Color token | Tappable |
|---|---|---|---|
| Idle, online | `Synced` | `bg-ok-bg text-ok-fg` | yes |
| Idle, offline | `Offline — saved locally` | `bg-warn-bg text-warn-fg` | yes (attempts reconnect) |
| Syncing (mid-flight) | `Syncing…` (with small spinner dot) | neutral (`bg-surface-sunken text-ink-muted`) | no |
| Transient success (~1.5s) | `Up to date ✓` | `bg-ok-bg text-ok-fg` | no while showing |
| Transient failure (~1.5s) | `Still offline` | `bg-warn-bg text-warn-fg` | no while showing |

Transient states auto-clear back to their idle counterpart via `setTimeout(1500)` (cleared on unmount). While non-tappable, `disabled` is set and `aria-busy="true"` during `Syncing…`.

## Section 3 — Behavior on tap

New helper: `src/services/sync.ts` exporting:

```ts
export async function forceResync(db: Firestore): Promise<'synced' | 'offline'>
```

Sequence:
1. Component enters `Syncing…`.
2. `forceResync` runs (with a 4000ms overall cap via `Promise.race` against a timeout):
   - `await disableNetwork(db)` — tears down the WebSocket.
   - `await enableNetwork(db)` — rebuilds it; active `onSnapshot` listeners re-fetch from server on reconnect.
   - `await waitForPendingWrites(db)` — resolves once any queued offline writes have flushed to the server.
3. On resolve → return `'synced'`; component shows `Up to date ✓` for 1500ms, then reverts.
4. On timeout or thrown error → return `'offline'`; component shows `Still offline` for 1500ms, then reverts.

The 4s cap exists so the pill never gets stuck on `Syncing…` — if the network truly is unreachable, `enableNetwork` may pend indefinitely.

Per CLAUDE.md rule 3, only `services/sync.ts` imports from `firebase/firestore` for this feature. The component imports `forceResync` and `getDb`.

`useOnlineStatus` remains the source of truth for the *idle* pill (drives Idle-online vs Idle-offline). Transient states are driven by the tap flow's return value. State machine: `idle → syncing → transient (success | failure) → idle`. When a transient state clears, the component re-reads `useOnlineStatus` to pick the correct idle pill — so a user who tapped while online and then went offline mid-sync ends up on the Offline pill, correctly.

## Section 4 — Placement

- **`/` (Log)** — pill is already in the top header row; no move, becomes interactive.
- **`/periods`, `/accounts`, `/savings`** — mount the pill in the top-right of each page's header, aligned with the page title. Consistent position across pages.
- **`/more`, `/categories`, `/report`** — no pill. Nothing on these pages that a user would care to force-refresh (`/more` is nav, `/categories` is administrative, `/report` is parked).

Header layout on the three added pages: existing title becomes a flex row (`flex items-center justify-between`), pill sits at the end. No other page chrome changes.

## Section 5 — Testing

**Unit — `services/sync.ts` (Vitest):**
- Mocked Firestore: asserts the call order `disableNetwork` → `enableNetwork` → `waitForPendingWrites`.
- Asserts `'synced'` when all three resolve within cap.
- Asserts `'offline'` when `enableNetwork` never resolves (timeout branch).
- Asserts `'offline'` when any call rejects.

**Unit — `SyncIndicator` component (Vitest + React Testing Library):**
- Renders correct copy/color for each of the five states.
- Tap in idle-online state calls `forceResync` and enters `Syncing…`.
- Tap while `Syncing…` is a no-op (button is disabled).
- Successful `forceResync` transitions to `Up to date ✓` then back to `Synced` after 1500ms.
- Failed `forceResync` transitions to `Still offline` then back to the offline pill after 1500ms.
- Timers are cleared on unmount (no state-set-after-unmount warning).

**E2E — Playwright:**
- Set browser context offline → tap pill → assert `Still offline` appears → assert pill returns to offline state.
- Set context online → tap pill → assert `Up to date ✓` appears → assert pill returns to `Synced`.
- (Cross-device staleness is out of scope for E2E — we test the mechanism, not the two-phone scenario.)

## Section 6 — What this design deliberately excludes

- Pull-to-refresh (see Rejected).
- Toast system (see Rejected).
- Per-query refresh (see Rejected).
- Changes to the Log page's input loop — the pill on `/` becomes tappable but *nothing else on that page moves or changes*. The ≤5s log stays sacred.
- Any change to how live listeners are wired in `useQueryData` — the reconnect trick relies on the existing `onSnapshot` re-fetch behavior; no hook changes needed.
- Any new dependencies. Uses only the existing Firestore SDK and Tailwind tokens.
