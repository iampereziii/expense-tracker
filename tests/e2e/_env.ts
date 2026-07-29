/**
 * Why the data-dependent specs are gated rather than `test.skip`-ed.
 *
 * They used to be unconditionally skipped, which meant the acceptance criteria
 * that cited them ("the offline-log-then-sync flow still passes") were satisfied
 * by tests that never ran — green while protecting nothing. A gate is honest: the
 * specs execute wherever a seeded test household is configured, and announce why
 * they were skipped where one isn't, instead of silently passing forever.
 *
 * To run them: point `.env.local` at a **test** Firebase project with a seeded
 * open period, then `npm run test:e2e`. Never point them at the household's live
 * project — the cutoff spec mutates period history.
 */
const REQUIRED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_HOUSEHOLD_ID",
] as const;

export const missingFirebaseEnv: string[] = REQUIRED.filter((key) => !process.env[key]);

export const hasFirebaseEnv = missingFirebaseEnv.length === 0;

export const firebaseSkipReason = `needs a seeded test household — missing ${missingFirebaseEnv.join(", ")}`;

/** The ≤5s one-handed log is the product, so the budget is an assertion, not a note. */
export const LOG_BUDGET_MS = 5_000;
