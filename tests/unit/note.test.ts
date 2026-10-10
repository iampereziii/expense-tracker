import { describe, it, expect } from "vitest";
import { EXPENSE_NOTE_MAX_LENGTH, normalizeNote } from "@/lib/note";

describe("normalizeNote", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeNote("  Jollibee w/ kids ")).toBe("Jollibee w/ kids");
  });

  it("stores no note as null, never an empty string", () => {
    expect(normalizeNote("")).toBeNull();
    expect(normalizeNote("   ")).toBeNull();
    expect(normalizeNote(undefined)).toBeNull();
    expect(normalizeNote(null)).toBeNull();
  });

  it("caps the note at the max length", () => {
    expect(normalizeNote("x".repeat(EXPENSE_NOTE_MAX_LENGTH + 20))).toHaveLength(
      EXPENSE_NOTE_MAX_LENGTH,
    );
  });
});
