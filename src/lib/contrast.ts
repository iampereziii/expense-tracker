import { INK_COLOR } from "./theme";

/**
 * WCAG contrast maths, kept pure so it is testable (engagement rule 7).
 *
 * This exists because category colours are *data*, not tokens: a chip's
 * background comes out of Firestore, so no palette decision can guarantee the
 * label on top of it is readable. Rather than hardcode white and hope, the
 * foreground is derived from the background at render time.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parses `#rgb` / `#rrggbb`. Returns null for anything else. */
export function parseHex(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  const value = Number.parseInt(expanded, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

/** Per-channel linearisation from the WCAG 2.x definition. */
function linearize(channel8Bit: number): number {
  const c = channel8Bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Contrast ratio between two hex colours, 1–21. Null if either is unparseable —
 * callers decide what to do with junk rather than getting a plausible number.
 */
export function contrastRatio(a: string, b: string): number | null {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) return null;
  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** SC 1.4.3 Contrast (Minimum), AA, for text below 24px / 18.66px bold. */
export const AA_CONTRAST_MINIMUM = 4.5;

/**
 * Picks white or ink for text sitting on `background`, whichever reads better.
 *
 * One of the two always clears 4.5:1 for any background whose own contrast with
 * both extremes isn't simultaneously poor — that band is narrow (mid greys), and
 * for those this still returns the better of the two rather than failing shut.
 * Unparseable input falls back to ink on the assumption the surface is light.
 */
export function readableTextOn(background: string): string {
  const againstWhite = contrastRatio(background, "#ffffff");
  const againstInk = contrastRatio(background, INK_COLOR);
  if (againstWhite === null || againstInk === null) return INK_COLOR;
  return againstWhite >= againstInk ? "#ffffff" : INK_COLOR;
}
