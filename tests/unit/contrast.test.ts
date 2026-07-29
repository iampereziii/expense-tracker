import { describe, expect, it } from "vitest";
import {
  AA_CONTRAST_MINIMUM,
  contrastRatio,
  parseHex,
  readableTextOn,
  relativeLuminance,
} from "@/lib/contrast";
import { CATEGORY_SWATCHES, DEFAULT_CATEGORY_COLOR, SEED_CATEGORIES } from "@/lib/constants";
import { BRAND_COLOR, INK_COLOR } from "@/lib/theme";

describe("parseHex", () => {
  it("reads six-digit hex", () => {
    expect(parseHex("#15803d")).toEqual({ r: 21, g: 128, b: 61 });
  });

  it("expands three-digit shorthand", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("tolerates a missing hash and stray whitespace", () => {
    expect(parseHex("  15803d ")).toEqual({ r: 21, g: 128, b: 61 });
  });

  it("returns null rather than guessing at junk", () => {
    expect(parseHex("")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("rebeccapurple")).toBeNull();
    expect(parseHex("#gggggg")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("anchors at black and white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("spans 1 to 21", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 4);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#15803d", "#ffffff")).toEqual(contrastRatio("#ffffff", "#15803d"));
  });

  it("returns null when either colour is unparseable", () => {
    expect(contrastRatio("nope", "#ffffff")).toBeNull();
    expect(contrastRatio("#ffffff", "nope")).toBeNull();
  });

  /**
   * These are the numbers recorded in tailwind.config.ts. If a token moves, this
   * fails — which is the point: the contrast claim stops being a prose promise.
   */
  it("confirms the brand green clears AA for white text", () => {
    const ratio = contrastRatio(BRAND_COLOR, "#ffffff");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(AA_CONTRAST_MINIMUM);
    expect(ratio!).toBeCloseTo(5.02, 1);
  });

  it("confirms the old brand green did NOT clear AA", () => {
    // Regression guard: #16a34a is what shipped, and it failed at 3.30:1.
    expect(contrastRatio("#16a34a", "#ffffff")!).toBeLessThan(AA_CONTRAST_MINIMUM);
  });

  it.each([
    ["ink.DEFAULT on white", INK_COLOR, "#ffffff"],
    ["ink.muted on white", "#475569", "#ffffff"],
    ["ok.fg on ok.bg", "#065f46", "#ecfdf5"],
    ["warn.fg on warn.bg", "#92400e", "#fffbeb"],
    ["white on brand.dark", "#ffffff", "#166534"],
  ])("clears AA: %s", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)!).toBeGreaterThanOrEqual(AA_CONTRAST_MINIMUM);
  });

  it.each([
    ["former slate-400 body text", "#94a3b8", "#ffffff"],
    ["former emerald-600 pill", "#059669", "#ecfdf5"],
    ["former amber-600 pill", "#d97706", "#fffbeb"],
  ])("guards the replaced failure: %s", (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)!).toBeLessThan(AA_CONTRAST_MINIMUM);
  });
});

describe("readableTextOn", () => {
  it("picks white on dark backgrounds and ink on light ones", () => {
    expect(readableTextOn("#0f172a")).toBe("#ffffff");
    expect(readableTextOn("#ecfdf5")).toBe(INK_COLOR);
  });

  it("falls back to ink for unparseable input", () => {
    expect(readableTextOn("not-a-colour")).toBe(INK_COLOR);
  });

  /**
   * The guarantee the chip rendering depends on. Category colours are Firestore
   * data, so this — not a token — is what keeps a chip label readable.
   */
  it.each([...CATEGORY_SWATCHES])("keeps swatch %s readable at AA", (swatch) => {
    const ratio = contrastRatio(swatch, readableTextOn(swatch));
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(AA_CONTRAST_MINIMUM);
  });

  it.each([...SEED_CATEGORIES.map((c) => c.color), DEFAULT_CATEGORY_COLOR])(
    "keeps already-seeded colour %s readable at AA",
    (color) => {
      // Seeds are already in the live household's Firestore, so these must pass
      // without a data migration.
      expect(contrastRatio(color, readableTextOn(color))!).toBeGreaterThanOrEqual(
        AA_CONTRAST_MINIMUM,
      );
    },
  );
});
