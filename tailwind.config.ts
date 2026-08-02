import type { Config } from "tailwindcss";

/**
 * Tailwind color tokens reference CSS variables defined in src/app/globals.css.
 * The palette source of truth is src/lib/tokens.ts (LIGHT and DARK exports).
 * globals.css mirrors tokens.ts; tests/unit/tokens.test.ts enforces the mirror.
 * The dual-theme contrast matrix in tokens.test.ts is the audit trail for SC 1.4.3.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
          contrast: "var(--brand-contrast)",
          soft: "var(--brand-soft)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        ok: { fg: "var(--ok-fg)", bg: "var(--ok-bg)" },
        warn: { fg: "var(--warn-fg)", bg: "var(--warn-bg)" },
        danger: { fg: "var(--danger-fg)", bg: "var(--danger-bg)" },
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
          ground: "var(--surface-ground)",
        },
        line: "var(--line)",
      },
    },
  },
  plugins: [],
};

export default config;
