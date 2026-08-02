import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AA_CONTRAST_MINIMUM, contrastRatio } from "@/lib/contrast";
import { DARK, LIGHT, type ThemeTokens } from "@/lib/tokens";

/** Text pairs — must clear 4.5:1 (SC 1.4.3 AA) in BOTH themes. */
const TEXT_PAIRS: ReadonlyArray<readonly [keyof ThemeTokens, keyof ThemeTokens]> = [
  ["ink", "surface"],
  ["ink", "surfaceGround"],
  ["ink", "surfaceSunken"],
  ["inkMuted", "surface"],
  ["inkMuted", "surfaceGround"],
  ["inkMuted", "surfaceSunken"],
  ["brandContrast", "brand"],
  ["brandContrast", "brandDark"],
  ["brand", "surface"],
  ["brand", "surfaceGround"],
  ["okFg", "okBg"],
  ["warnFg", "warnBg"],
  ["dangerFg", "dangerBg"],
];

/** Non-text (icon/graphic) pairs — 3:1 (SC 1.4.11). */
const NONTEXT_PAIRS: ReadonlyArray<readonly [keyof ThemeTokens, keyof ThemeTokens]> = [
  ["brand", "brandSoft"],
];

describe.each([
  ["light", LIGHT],
  ["dark", DARK],
] as const)("%s theme contrast", (_name, t) => {
  it.each(TEXT_PAIRS)("text %s on %s clears AA 4.5:1", (fg, bg) => {
    const ratio = contrastRatio(t[fg], t[bg]);
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(AA_CONTRAST_MINIMUM);
  });

  it.each(NONTEXT_PAIRS)("graphic %s on %s clears 3:1", (fg, bg) => {
    expect(contrastRatio(t[fg], t[bg])!).toBeGreaterThanOrEqual(3);
  });
});

/**
 * globals.css must mirror tokens.ts exactly — same trick theme.test.ts uses for
 * manifest.json. CSS can't import TS, so we assert the text instead.
 *
 * NOTE: This describe block is currently RED — Task 2 will make it PASS by adding
 * CSS variables to src/app/globals.css. This is the intentional red state for Task 2's TDD cycle.
 */
const CSS_VAR_NAMES: Record<keyof ThemeTokens, string> = {
  brand: "--brand",
  brandDark: "--brand-dark",
  brandContrast: "--brand-contrast",
  brandSoft: "--brand-soft",
  ink: "--ink",
  inkMuted: "--ink-muted",
  surface: "--surface",
  surfaceSunken: "--surface-sunken",
  surfaceGround: "--surface-ground",
  line: "--line",
  okFg: "--ok-fg",
  okBg: "--ok-bg",
  warnFg: "--warn-fg",
  warnBg: "--warn-bg",
  dangerFg: "--danger-fg",
  dangerBg: "--danger-bg",
};

describe("globals.css mirrors tokens.ts", () => {
  const css = readFileSync(resolve(__dirname, "../../src/app/globals.css"), "utf8");
  const darkStart = css.indexOf("prefers-color-scheme: dark");
  it("has a dark override block", () => expect(darkStart).toBeGreaterThan(-1));
  const lightCss = css.slice(0, darkStart);
  const darkCss = css.slice(darkStart);

  it.each(Object.keys(CSS_VAR_NAMES) as Array<keyof ThemeTokens>)(
    "light --%s in sync",
    (key) => expect(lightCss).toContain(`${CSS_VAR_NAMES[key]}: ${LIGHT[key]}`),
  );
  it.each(Object.keys(CSS_VAR_NAMES) as Array<keyof ThemeTokens>)(
    "dark --%s in sync",
    (key) => expect(darkCss).toContain(`${CSS_VAR_NAMES[key]}: ${DARK[key]}`),
  );
});
