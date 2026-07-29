import type { Config } from "tailwindcss";

/**
 * The single source of colour for the app. Every ratio below is against the
 * surface the token is actually used on, computed with the WCAG 2.x relative
 * luminance formula, and the bar is 4.5:1 — SC 1.4.3 Contrast (Minimum), AA.
 *
 * The Save label is 18px/600, which does NOT qualify as WCAG large text (that
 * starts at 24px, or 18.66px bold), so it needs the full 4.5:1. The previous
 * brand green (#16a34a) gave white text only 3.30:1 and failed; the palette was
 * re-derived rather than verified. Keep the ratios in these comments current —
 * they are the audit trail for the contrast acceptance criterion.
 *
 * Tokens live here (Tailwind v3) by decision CC-1 of the UI-polish challenge
 * review; the port to CSS `@theme` is batched with the Next.js 14 EOL upgrade.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Money in control" green. Carries white text on buttons and chips.
        brand: {
          DEFAULT: "#15803d", // white on this: 5.02:1 ✓ AA
          dark: "#166534", // pressed state — white on this: 7.13:1 ✓ AAA
        },
        // Text scale on white. `ink.muted` replaces every former slate-400,
        // which measured 2.51:1 and failed outright.
        ink: {
          DEFAULT: "#0f172a", // on white: 18.1:1 ✓
          muted: "#475569", // on white: 7.58:1 ✓ AA (was #94a3b8, 2.51:1 ✗)
        },
        // Status pills. Both foregrounds were two steps too light before.
        ok: {
          fg: "#065f46", // on ok.bg: 7.30:1 ✓ (was #059669 on #ecfdf5, 3.60:1 ✗)
          bg: "#ecfdf5",
        },
        warn: {
          fg: "#92400e", // on warn.bg: 6.84:1 ✓ (was #d97706 on #fffbeb, 3.13:1 ✗)
          bg: "#fffbeb",
        },
        // Neutral surfaces.
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f1f5f9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
