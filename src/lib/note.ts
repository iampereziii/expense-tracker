/** Long enough for "where / what / who", short enough to keep the Last logged row on one line. */
export const EXPENSE_NOTE_MAX_LENGTH = 80;

/**
 * Trimmed note, or null when there's nothing to keep. Blank and whitespace-only
 * input both become null so "no note" has exactly one representation in Firestore.
 */
export function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim() ?? "";
  return trimmed ? trimmed.slice(0, EXPENSE_NOTE_MAX_LENGTH) : null;
}
