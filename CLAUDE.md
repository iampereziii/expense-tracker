# CLAUDE.md — Expense Tracker

## Purpose

An **offline-first PWA** that replaces the household's Google Forms expense habit with effortless, sub-5-second logging that syncs across two devices into one shared budget. The entire design serves one goal: **make logging so fast and low-friction that the routine sticks.** If updating an expense isn't faster than the old Google Form, the project has failed — treat input speed as the primary feature, not a polish item.

- **Client:** Personal (Perez–Domingo household — two users, equal access)
- **Primary users:** Two non-technical household members, mobile-first, one-handed, on the go
- **Core goal:** Log an expense in **≤5 seconds, one-handed, at 375px**, working fully offline, syncing to a shared budget when online

> Architecture docs live in the **ais** repo: `c:/local-instance/ais/projects/expense-tracker/` (project-spec, scoping, discovery, ADR-0001 Firestore, ADR-0002 Anonymous Auth).

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 (App Router) | **Static export** (`output: 'export'`) — no server runtime |
| Data / Sync | Firestore (Firebase) | Offline persistence (multi-tab IndexedDB cache); client SDK only, **no API layer** |
| Auth | Firebase Anonymous Auth | Silent device `uid` so rules can require an authenticated session; Google sign-in deferred (ADR-0002) |
| Hosting | AWS Amplify (static) | Cross-vendor by choice: Amplify hosts; Firebase = data + auth only |
| Styling | Tailwind CSS | Mobile-first @375px |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | No `any` |
| Unit / E2E | Vitest / Playwright | |

---

## Structure

```
src/
  app/
    page.tsx              # "/"  — Fast Expense Input (the core loop)
    periods/page.tsx      # declare a period: budget + income + balance review; awareness card
    accounts/page.tsx     # accounts + live balances (add / rename / archive / edit balance)
    savings/page.tsx      # virtual savings pots + manual transfers; derived "savings main"
    categories/page.tsx   # category add / rename / archive
    report/page.tsx       # PARKED stub (F5)
    layout.tsx            # AuthProvider + NavBar + SW registration + metadata
    globals.css
  components/
    input/                # CategoryChips
    ui/                   # Button, AmountField (primitives)
    providers/            # AuthProvider (anon sign-in + seed), RegisterSW
    NavBar.tsx, SyncIndicator.tsx, AwarenessCard.tsx, SnapshotEditor.tsx
  lib/
    firebase.ts           # app + Firestore (persistent cache) + auth; HOUSEHOLD_ID
    money.ts              # PHP format / parse / roundCentavos
    awareness.ts          # period-over-period reconciliation math (pure)
    savings.ts            # pot allocation + derived-balance math (pure)
    constants.ts          # seed categories (Food, Bills)
  services/               # ALL Firestore access — expenses, periods, categories,
                          #   accounts, balances (cutoff snapshots), savings (pots + ledger)
  hooks/                  # useActivePeriod, useCategories, useExpenses, useAccounts,
                          #   usePeriodBalances, useSavingsPots, useOnlineStatus, useQueryData
  types/                  # Household, Category, Period, Expense, Account,
                          #   BalanceSnapshot, SavingsPot, Allocation
public/  manifest.json, sw.js, icons/        firestore.rules        .env.example
```

---

## Conventions

- **Git:** branches `feat|fix|chore/<short-desc>`; PRs target `main`; conventional commits.
- **TypeScript strict** — `npm run typecheck` (`tsc --noEmit`) must pass; no `any` (use `unknown` + guards).
- **Tailwind only** — mobile-first, no UI component libraries (no shadcn/MUI/Chakra).
- **Currency is PHP everywhere** — format via `lib/money.ts`, never hardcode.
- **Naming:** Components `PascalCase` · hooks `useCamelCase` · lib/services `camelCase`.
- **Testing:** Vitest (`npm test`) for logic; Playwright (`npm run test:e2e`) for the input loop and the offline-log-then-sync flow.

---

## How to Engage

1. **Input speed is the product.** Before adding anything, ask whether it helps or hurts the ≤5-second one-handed log. The amount field is pre-focused on `/`; logging is a number + a chip tap + Save.
2. **Offline persistence is the architecture — never weaken it.** Firestore is initialized once in `lib/firebase.ts` with a persistent multi-tab cache. All writes must succeed offline and reconcile on reconnect. No blocking network calls on the write path.
3. **All data access goes through `services/`.** Pages/components never import Firestore directly — use `services/expenses.ts`, `periods.ts`, `categories.ts`, `accounts.ts`, `balances.ts`, `savings.ts`. The data model (and the `HOUSEHOLD_ID` scope) is enforced in one place.
4. **Everything is household-scoped.** All reads/writes live under `households/{householdId}`. This is what lets real auth drop in later — don't write data outside a household.
5. **Categories, accounts and pots archive, never delete.** Expenses reference categories by id, cutoff snapshots reference accounts by id, ledger entries reference pots by id; hard-deleting orphans history. "Remove" sets `archived: true`; hard delete only when nothing references it.
6. **Exactly one open period.** Declaring a period closes the prior (sets `endDate`); expenses land against the newest open period. No period → prompt to declare before logging.
7. **Totals are derived, never stored.** Expense totals, pot balances (summed from `allocations/`), and "savings main" (bank total − pots) are all computed at read time so they can't drift from the entries that produced them. Keep the math in `lib/awareness.ts` / `lib/savings.ts` as pure functions — that's where it's testable.
8. **A cutoff snapshot is history.** `periods/{id}/balances/{accountId}` freezes name, type and balance at declaration. Only the newest period's snapshot is correctable; older ones are immutable, and live balance edits on `/accounts` must never rewrite a past snapshot.
9. **Declaring a period is one batch.** The period doc, snapshot freeze, live-balance corrections, and pot allocations commit together in `declarePeriod` with a client-generated id — it must never land half-applied, and it must work offline.
10. **For "what's current best practice" questions** (PWA tooling, Firestore APIs) — use WebSearch; don't rely on training-time knowledge.

---

## What Doesn't Belong Here

- **A backend/API layer** — there isn't one by design; the client SDK + Security Rules are the backend. No Next.js API routes without revisiting ADR-0001.
- **Real auth / login UX** — deferred (ADR-0002). Anonymous Auth only for MVP.
- **Out-of-scope features** — CSV/PDF export, multi-currency, recurring transactions, multi-household. Post-MVP; must not creep into the build.
- **The report** (`/report`) — parked; build only after the input routine has stuck (and Gap #5 charting choice is settled).
- **Credentials beyond the public Firebase config** — never commit `.env.local`.
