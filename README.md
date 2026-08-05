# Expense Tracker

Offline-first PWA for a two-person household to log expenses in **under 5 seconds, one-handed, on mobile** — replacing a Google Forms flow. Two devices share one budget via Firestore; spending tracks against user-declared budget periods.

> Architecture & decisions live in the **ais** repo: `c:/local-instance/ais/projects/expense-tracker/`
> (project-spec, scoping, discovery, ADR-0001 Firestore, ADR-0002 Anonymous Auth).

## Stack

Next.js 14 (static export) · Firestore (offline persistence + sync) · Firebase Anonymous Auth · Tailwind · AWS Amplify hosting · TypeScript strict.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in Firebase config + NEXT_PUBLIC_HOUSEHOLD_ID
npm run dev                  # http://localhost:3000
```

Without `.env.local` the app runs but shows a "set your config" screen — it needs a Firebase project (Firestore + Anonymous Auth enabled) and an unguessable household id.

### Scripts

| Script | Does |
|--------|------|
| `npm run dev` | Local dev server |
| `npm run dev:lan` | Dev server exposed on the LAN — for testing on a real phone |
| `npm run build` | Static export to `out/` |
| `npm run serve:out` | Serve the built `out/` locally (PWA / offline checks) |
| `npm run lint` | `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright (input + offline-sync flow) |

## Firebase setup (one-time)

1. Create a Firebase project; enable **Firestore** and **Anonymous Auth**.
2. Deploy `firestore.rules` (signed-in access, household-scoped, no enumeration).
3. Copy the web config into `.env.local`; set `NEXT_PUBLIC_HOUSEHOLD_ID` to a long random value.
4. Categories (`Food`, `Bills`) seed automatically on first authenticated load.

### Resetting / recreating the database

Deleting the Firestore database is **permanent** — there is no backup or undo. To start fresh:

1. Recreate the **`(default)`** database in the same project (the client SDK targets `(default)` only; a named database will silently never connect).
2. Redeploy `firestore.rules` — a fresh database does not keep the old rules.
3. **Clear site data (IndexedDB) on every device** that used the app, then reload. The offline cache holds a full copy of the old data and can replay stale writes into the new database. This also resets the anonymous uid; the app signs in again silently.
4. No code or `.env.local` changes needed. Categories re-seed on first load; re-add accounts and declare a new period before logging.



- **Built:** foundation, **fast input loop** (F1), offline persistence (F2), budget periods (F3), categories (F4).
- **Parked:** the **report** (F5) — `src/app/report/page.tsx` is a stub; charting library still undecided (ais project-spec Gap #5).
- **TODO before shipping:** real PWA icons in `public/icons/` (see that folder's README).

## Status

Scaffold per the ais `project-spec.md`. Not yet wired to a live Firebase project.
