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
| `npm run build` | Static export to `out/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (input + offline-sync flow) |

## Firebase setup (one-time)

1. Create a Firebase project; enable **Firestore** and **Anonymous Auth**.
2. Deploy `firestore.rules` (signed-in access, household-scoped, no enumeration).
3. Copy the web config into `.env.local`; set `NEXT_PUBLIC_HOUSEHOLD_ID` to a long random value.
4. Categories (`Food`, `Bills`) seed automatically on first authenticated load.

## What's built vs parked

- **Built:** foundation, **fast input loop** (F1), offline persistence (F2), budget periods (F3), categories (F4).
- **Parked:** the **report** (F5) — `src/app/report/page.tsx` is a stub; charting library still undecided (ais project-spec Gap #5).
- **TODO before shipping:** real PWA icons in `public/icons/` (see that folder's README).

## Status

Scaffold per the ais `project-spec.md`. Not yet wired to a live Firebase project.
