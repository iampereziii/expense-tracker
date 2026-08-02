/**
 * The single source of both palettes. globals.css mirrors these as CSS
 * variables (tests/unit/tokens.test.ts enforces the mirror), and the dual-theme
 * contrast matrix in the same test is the audit trail for SC 1.4.3.
 */
export interface ThemeTokens {
  /** Brand green. Light: original anchor. Dark: brighter so it carries on dark ground. */
  brand: string;
  /** Pressed state of brand. */
  brandDark: string;
  /** Text/icon color that sits ON brand surfaces (white in light, deep green in dark). */
  brandContrast: string;
  /** Soft tint behind the active nav icon pill — decorative, 3:1 vs brand. */
  brandSoft: string;
  ink: string;
  inkMuted: string;
  /** Card surface. */
  surface: string;
  /** Sunken fills: unselected chips, inputs, track of progress bar. */
  surfaceSunken: string;
  /** Page ground (body background). */
  surfaceGround: string;
  /** Hairline borders. */
  line: string;
  okFg: string;
  okBg: string;
  warnFg: string;
  warnBg: string;
  dangerFg: string;
  dangerBg: string;
}

export const LIGHT: ThemeTokens = {
  brand: "#15803d",
  brandDark: "#166534",
  brandContrast: "#ffffff",
  brandSoft: "#d7ead9",
  ink: "#122018",
  inkMuted: "#47604f",
  surface: "#ffffff",
  surfaceSunken: "#e7ede4",
  surfaceGround: "#f3f6f1",
  line: "#dde5da",
  okFg: "#065f46",
  okBg: "#ecfdf5",
  warnFg: "#92400e",
  warnBg: "#fffbeb",
  dangerFg: "#b91c1c",
  dangerBg: "#fee2e2",
};

export const DARK: ThemeTokens = {
  brand: "#4ade80",
  brandDark: "#22c55e",
  brandContrast: "#052e16",
  brandSoft: "#1d3a29",
  ink: "#e8f0ea",
  inkMuted: "#9fb3a6",
  surface: "#182420",
  surfaceSunken: "#1f2d26",
  surfaceGround: "#0f1712",
  line: "#243029",
  okFg: "#6ee7b7",
  okBg: "#0b2e23",
  warnFg: "#fbbf24",
  warnBg: "#2e2308",
  dangerFg: "#fca5a5",
  dangerBg: "#3f1d1d",
};
