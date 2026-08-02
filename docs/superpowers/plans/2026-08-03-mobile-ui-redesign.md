# 2026 Mobile UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every color to CSS-variable tokens with a system-following dark theme, re-skin all screens with a consistent card/radius rhythm, consolidate the 6-tab nav to 4 (Log · Budget · Money · More), and add save feedback with Undo — without regressing the ≤5-second one-handed logging loop.

**Architecture:** Token-first, four independently shippable phases (each is its own branch/PR off `main`). `src/lib/tokens.ts` becomes the single TS source of both palettes; `globals.css` mirrors it as CSS variables (a unit test enforces the mirror); `tailwind.config.ts` maps existing token names to `var(--…)` so most component class names survive. All Firestore access stays in `services/`; the log/undo write path stays synchronous fire-and-forget.

**Tech Stack:** Next.js 14 App Router (static export), Tailwind CSS v3, Firebase Firestore client SDK, TypeScript strict, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-03-mobile-ui-redesign-design.md`

## Global Constraints

- Logging stays: number + chip tap + Save — zero added taps; amount field pre-focused; Save in thumb reach with keyboard open (`min-h-[100dvh]` + `mt-auto` layout preserved).
- **Never make `handleSave`, `addExpense`, or `deleteExpense` async / awaited.** Firestore write promises resolve only on server ack — awaiting hangs offline. Fire-and-forget with `.catch(onError)`.
- Every color pair ≥ 4.5:1 in **both** themes, enforced by unit tests (WCAG 2.x relative luminance, existing `lib/contrast.ts`).
- Dark mode follows `prefers-color-scheme` only — no toggle UI, no stored preference.
- All Firestore access through `services/` — pages/components never import `firebase/firestore`.
- Tailwind only — no UI component libraries, no icon libraries (inline SVG).
- Currency formatting only via `lib/money.ts` (`formatPHP`).
- TypeScript strict; `npm run typecheck` must pass; no `any`.
- All added motion < 200ms and carries `motion-reduce:` variants (global escape hatch exists in `globals.css`).
- Conventional commits. Each phase ends green on `npm run typecheck`, `npm test`, `npm run test:e2e` and leaves the app fully usable.
- E2E tests follow the existing pattern: `test.skip(!hasFirebaseEnv, firebaseSkipReason)` from `tests/e2e/_env.ts`.

## File Structure

```
Phase 1 (branch feat/design-tokens-dark-mode)
  src/lib/tokens.ts                 NEW — LIGHT/DARK ThemeTokens records (single source)
  tests/unit/tokens.test.ts         NEW — dual-theme contrast matrix + CSS-sync test
  src/app/globals.css               tokens on :root + dark override; body uses vars
  tailwind.config.ts                token names → var(--…); adds danger/line/ground/soft
  src/lib/theme.ts                  BRAND_COLOR/INK_COLOR re-anchored to tokens.ts
  tests/unit/theme.test.ts          updated for var() mapping
  tests/unit/contrast.test.ts       updated INK expectations
  src/app/layout.tsx                per-scheme themeColor
  public/manifest.json              background_color → warm ground
  src/components/NavBar.tsx, ui/Button.tsx, src/app/page.tsx (+ grep sweep)
                                    hardcoded slate/red/white → tokens
Phase 2 (branch feat/reskin-screens)
  src/components/ui/Card.tsx        NEW — 14px-radius tonal card
  src/components/ui/Button.tsx      radius 18px
  src/app/page.tsx                  budget progress bar; amount text-6xl
  src/app/{periods,accounts,savings,categories}/page.tsx  content onto Cards
Phase 3 (branch feat/nav-four-tabs)
  src/app/more/page.tsx             NEW — links page
  src/components/NavBar.tsx         4 tabs, inline SVG icons, active pill
  src/components/MoneySwitch.tsx    NEW — Accounts | Savings segmented switch
  src/app/accounts/page.tsx, src/app/savings/page.tsx     mount MoneySwitch
  tests/e2e/navigation.spec.ts      NEW
Phase 4 (branch feat/save-feedback)
  src/services/expenses.ts          addExpense returns id; deleteExpense
  src/app/page.tsx                  vibrate, Saved ✓, undo toast, last-logged row
  tests/e2e/save-feedback.spec.ts   NEW
```

---

# Phase 1 — Design tokens & dark theme

- [ ] **Phase 1 setup:** `git checkout main && git checkout -b feat/design-tokens-dark-mode`

### Task 1: Token source of truth + dual-theme contrast tests

**Files:**
- Create: `src/lib/tokens.ts`
- Test: `tests/unit/tokens.test.ts`

**Interfaces:**
- Produces: `ThemeTokens` interface and `LIGHT: ThemeTokens`, `DARK: ThemeTokens` from `@/lib/tokens`. Keys: `brand, brandDark, brandContrast, brandSoft, ink, inkMuted, surface, surfaceSunken, surfaceGround, line, okFg, okBg, warnFg, warnBg, dangerFg, dangerBg`. Later tasks import these exact names.
- Consumes: `contrastRatio`, `AA_CONTRAST_MINIMUM` from `@/lib/contrast` (existing).

- [ ] **Step 1: Write the failing test**

`tests/unit/tokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: FAIL — cannot resolve `@/lib/tokens`.

- [ ] **Step 3: Write `src/lib/tokens.ts`**

All ratios below were pre-verified with the WCAG formula (see spec). Do not tweak a hex without re-running the test.

```ts
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
```

- [ ] **Step 4: Run test again**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: contrast matrix PASSES; the `globals.css mirrors tokens.ts` block still FAILS (CSS not written yet — that's Task 2). That split is fine; commit only once Task 2 turns the whole file green **or** commit now with the CSS-sync `describe` marked `.todo`. Prefer: proceed to Task 2 immediately and commit both together only if Task 2 is done in the same sitting; otherwise use `describe.todo`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens.ts tests/unit/tokens.test.ts
git commit -m "feat: add dual-theme token source with contrast matrix tests"
```

### Task 2: CSS variables + Tailwind mapping

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

**Interfaces:**
- Consumes: `LIGHT`/`DARK` values from Task 1 (hexes copied verbatim into CSS).
- Produces: Tailwind classes `bg-brand`, `bg-brand-dark`, `text-brand-contrast`, `bg-brand-soft`, `text-ink`, `text-ink-muted`, `bg-surface`, `bg-surface-sunken`, `bg-surface-ground`, `border-line`, `text-ok-fg`/`bg-ok-bg`, `text-warn-fg`/`bg-warn-bg`, `text-danger-fg`/`bg-danger-bg` — all theme-aware via `var(--…)`.

- [ ] **Step 1: Rewrite `globals.css`**

Replace the current `:root` and `html, body` blocks (keep the `main` padding, `input` font-size, and reduced-motion blocks exactly as they are):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
 * Both palettes live in src/lib/tokens.ts; tests/unit/tokens.test.ts fails if
 * these values drift from it. Dark simply follows the phone setting — there is
 * deliberately no toggle UI (spec: 2026 redesign, Section 1).
 */
:root {
  color-scheme: light dark;
  --brand: #15803d;
  --brand-dark: #166534;
  --brand-contrast: #ffffff;
  --brand-soft: #d7ead9;
  --ink: #122018;
  --ink-muted: #47604f;
  --surface: #ffffff;
  --surface-sunken: #e7ede4;
  --surface-ground: #f3f6f1;
  --line: #dde5da;
  --ok-fg: #065f46;
  --ok-bg: #ecfdf5;
  --warn-fg: #92400e;
  --warn-bg: #fffbeb;
  --danger-fg: #b91c1c;
  --danger-bg: #fee2e2;
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand: #4ade80;
    --brand-dark: #22c55e;
    --brand-contrast: #052e16;
    --brand-soft: #1d3a29;
    --ink: #e8f0ea;
    --ink-muted: #9fb3a6;
    --surface: #182420;
    --surface-sunken: #1f2d26;
    --surface-ground: #0f1712;
    --line: #243029;
    --ok-fg: #6ee7b7;
    --ok-bg: #0b2e23;
    --warn-fg: #fbbf24;
    --warn-bg: #2e2308;
    --danger-fg: #fca5a5;
    --danger-bg: #3f1d1d;
  }
}

html,
body {
  margin: 0;
  background: var(--surface-ground);
  color: var(--ink);
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 2: Map Tailwind tokens to the variables**

In `tailwind.config.ts`, replace the whole `colors` object (keep the file header comment but update it — the audit trail for ratios now lives in `tests/unit/tokens.test.ts`, not comments):

```ts
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
```

- [ ] **Step 3: Run the tokens test — CSS sync now passes**

Run: `npx vitest run tests/unit/tokens.test.ts`
Expected: ALL PASS (remove the `describe.todo` if used in Task 1).

- [ ] **Step 4: Run typecheck and the app**

Run: `npm run typecheck` — PASS. Then `npm run dev`, open http://localhost:3000 at 375px width: page ground is warm off-white, text near-black, brand button green. Toggle OS dark mode: ground goes dark green-tinted, text light. (Chips/pills may still show light-theme hardcoded colors — fixed in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css tailwind.config.ts tests/unit/tokens.test.ts
git commit -m "feat: move all colors to CSS-variable tokens with dark palette"
```

### Task 3: Re-anchor theme.ts, per-scheme PWA chrome, fix affected tests

**Files:**
- Modify: `src/lib/theme.ts`
- Modify: `src/app/layout.tsx`
- Modify: `public/manifest.json`
- Modify: `tests/unit/theme.test.ts`
- Modify: `tests/unit/contrast.test.ts` (one expectation)

**Interfaces:**
- Consumes: `LIGHT`, `DARK` from `@/lib/tokens`.
- Produces: `BRAND_COLOR === LIGHT.brand`, `INK_COLOR === LIGHT.ink` (chip text fallback everywhere becomes `#122018`), `THEME_COLOR_DARK === DARK.surface`.

- [ ] **Step 1: Update the failing tests first**

`tests/unit/theme.test.ts` — replace entirely:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindConfig from "../../tailwind.config";
import { BRAND_COLOR, INK_COLOR } from "@/lib/theme";
import { LIGHT } from "@/lib/tokens";

/**
 * Tailwind now holds var(--…) references, so the hex lives in tokens.ts. These
 * tests pin the remaining copies (manifest, theme.ts) to that single source.
 */
describe("theme colour has one source", () => {
  const manifest: unknown = JSON.parse(
    readFileSync(resolve(__dirname, "../../public/manifest.json"), "utf8"),
  );

  function colorAt(path: readonly string[]): unknown {
    let node: unknown = tailwindConfig.theme?.extend?.colors;
    for (const key of path) {
      if (typeof node !== "object" || node === null) return undefined;
      node = (node as Record<string, unknown>)[key];
    }
    return node;
  }

  it("theme.ts constants match the light tokens", () => {
    expect(BRAND_COLOR).toBe(LIGHT.brand);
    expect(INK_COLOR).toBe(LIGHT.ink);
  });

  it("manifest theme_color stays the light brand", () => {
    expect(manifest).toMatchObject({ theme_color: LIGHT.brand });
  });

  it("manifest background_color is the light ground", () => {
    expect(manifest).toMatchObject({ background_color: LIGHT.surfaceGround });
  });

  it("Tailwind brand token delegates to the CSS variable", () => {
    expect(colorAt(["brand", "DEFAULT"])).toBe("var(--brand)");
  });

  it("Tailwind ink token delegates to the CSS variable", () => {
    expect(colorAt(["ink", "DEFAULT"])).toBe("var(--ink)");
  });
});
```

In `tests/unit/contrast.test.ts`, the `it.each` table entry `["ink.muted on white", "#475569", "#ffffff"]` updates to `["ink.muted on white", "#47604f", "#ffffff"]`. The `readableTextOn` describe keeps working because it compares against `INK_COLOR` (now `#122018`) — no literal change needed there.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/theme.test.ts tests/unit/contrast.test.ts`
Expected: FAIL — `INK_COLOR` is still `#0f172a`, manifest `background_color` is `#ffffff`.

- [ ] **Step 3: Implement**

`src/lib/theme.ts`:

```ts
import { DARK, LIGHT } from "@/lib/tokens";

/** Light brand — manifest + light browser chrome. tests/unit/theme.test.ts pins the copies. */
export const BRAND_COLOR = LIGHT.brand;

/** Chip-text dark option in readableTextOn; matches the light ink token. */
export const INK_COLOR = LIGHT.ink;

/** Installed-app chrome in dark mode matches the dark card surface. */
export const THEME_COLOR_DARK = DARK.surface;
```

`src/app/layout.tsx` viewport export:

```ts
import { BRAND_COLOR, THEME_COLOR_DARK } from "@/lib/theme";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
  ],
};
```

`public/manifest.json`: `"background_color": "#f3f6f1"` (manifest has no per-scheme support — the viewport meta handles live chrome; manifest keeps light values).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run` — ALL unit tests PASS (money/awareness/savings untouched).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/app/layout.tsx public/manifest.json tests/unit/theme.test.ts tests/unit/contrast.test.ts
git commit -m "feat: per-scheme PWA theme colors anchored to token source"
```

### Task 4: Sweep remaining hardcoded colors to tokens; close Phase 1

**Files:**
- Modify: `src/components/NavBar.tsx:20` (border), `src/components/ui/Button.tsx:7-11`, `src/app/page.tsx:119,151-153`, plus whatever the grep in Step 1 finds (`AwarenessCard.tsx`, `SnapshotEditor.tsx`, `SyncIndicator.tsx`, secondary pages).

**Interfaces:**
- Consumes: Tailwind classes from Task 2.
- Produces: zero raw `slate-*`, `red-*`, `emerald-*`, `amber-*`, `text-white`, `bg-white` classes in `src/` (except inline styles driven by Firestore data in `CategoryChips.tsx`).

- [ ] **Step 1: Find every offender**

Run: `rg -n "slate-|red-|amber-|emerald-|white|#[0-9a-fA-F]{3,6}" src/ --glob "*.tsx"`
List the hits; each gets replaced by the mapping below.

- [ ] **Step 2: Apply the mapping**

| Old class | New class |
|---|---|
| `text-white` (on brand bg) | `text-brand-contrast` |
| `border-slate-200` / `border-slate-100` | `border-line` |
| `active:bg-slate-200` (ghost button) | `active:bg-line` |
| `text-slate-500` / `text-slate-400` / `text-slate-600` | `text-ink-muted` |
| `bg-white` | `bg-surface` |
| `text-red-700` / `text-red-600` | `text-danger-fg` |
| `bg-red-100 text-red-800 active:bg-red-200` (danger button) | `bg-danger-bg text-danger-fg active:opacity-80` |
| `bg-emerald-*` / `text-emerald-*` status pills | `bg-ok-bg text-ok-fg` |
| `bg-amber-*` / `text-amber-*` status pills | `bg-warn-bg text-warn-fg` |

Exact known edits:
- `Button.tsx` styles record becomes:

```ts
const styles: Record<Variant, string> = {
  primary: "bg-brand text-brand-contrast active:bg-brand-dark",
  ghost: "bg-surface-sunken text-ink active:bg-line",
  danger: "bg-danger-bg text-danger-fg active:opacity-80",
};
```

- `NavBar.tsx` nav className: `border-t border-slate-200` → `border-t border-line`.
- `page.tsx`: `remaining < 0 ? "text-red-700"` → `"text-danger-fg"`; save-error `text-red-700` → `text-danger-fg`.
- Leave `CategoryChips.tsx` inline `style={{ backgroundColor, color }}` alone — Firestore-driven, theme-safe via `readableTextOn`.

- [ ] **Step 3: Verify**

Run: `rg -n "slate-|red-|amber-|emerald-" src/ --glob "*.tsx"` — zero hits.
Run: `npm run typecheck && npx vitest run` — PASS.

- [ ] **Step 4: Full e2e + both-theme eyeball**

Run: `npm run test:e2e` — PASS (or env-skip).
`npm run dev` at 375px: walk all six routes in light AND dark (OS toggle). No white-on-white, no dark-on-dark anywhere.

- [ ] **Step 5: Commit + finish phase**

```bash
git add -A src/
git commit -m "feat: replace remaining hardcoded colors with theme tokens"
```

Phase 1 done — app fully usable, light mode subtly warmed, dark mode complete. Merge `feat/design-tokens-dark-mode` to `main` (PR per repo convention) before starting Phase 2.

---

# Phase 2 — Screen re-skin

- [ ] **Phase 2 setup:** `git checkout main && git checkout -b feat/reskin-screens`

### Task 5: Card primitive + button radius

**Files:**
- Create: `src/components/ui/Card.tsx`
- Modify: `src/components/ui/Button.tsx:21`

**Interfaces:**
- Produces: `Card({ className?, children })` from `@/components/ui/Card` — later tasks wrap page sections in it.

- [ ] **Step 1: Create `Card.tsx`**

```tsx
import type { ReactNode } from "react";

/** Tonal card — the 14px-radius surface every secondary-screen section sits on. */
export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-[14px] bg-surface p-4 shadow-sm ${className}`}>{children}</div>
  );
}
```

- [ ] **Step 2: Button radius 18px**

In `Button.tsx`, `rounded-xl` → `rounded-[18px]` (radius scale: cards 14 / primary buttons 18 / chips full-round).

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npx vitest run` — PASS.

```bash
git add src/components/ui/Card.tsx src/components/ui/Button.tsx
git commit -m "feat: add Card primitive and 18px button radius"
```

### Task 6: Log screen — budget progress bar + bigger amount

**Files:**
- Modify: `src/app/page.tsx` (header block ~line 115-130; amount input ~line 141)
- Test: `tests/e2e/input-loop.spec.ts` (add one assertion)

**Interfaces:**
- Consumes: existing `total`, `period.budgetAmount` already in scope in `InputPage`.

- [ ] **Step 1: Extend the e2e spec (failing first)**

Add to `tests/e2e/input-loop.spec.ts` inside the describe:

```ts
test("shows budget progress under the header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("budget-progress")).toBeVisible();
});
```

Run: `npm run test:e2e -- input-loop` — new test FAILS (or note env-skip; if skipped, verify by dev-server eyeball in Step 3).

- [ ] **Step 2: Implement**

In `page.tsx`, above the return:

```ts
const spentFraction =
  period && period.budgetAmount > 0 ? Math.min(total / period.budgetAmount, 1) : 0;
```

Directly under the closing `</header>` tag:

```tsx
{/* Spent-of-budget at a glance — width animates, motion-reduce kills it. */}
<div
  data-testid="budget-progress"
  className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
  role="progressbar"
  aria-label="Budget used"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(spentFraction * 100)}
>
  <div
    className="h-full rounded-full bg-brand transition-[width] duration-200 motion-reduce:transition-none"
    style={{ width: `${spentFraction * 100}%` }}
  />
</div>
```

Amount input className: `text-5xl` → `text-6xl tracking-tight`.

- [ ] **Step 3: Verify**

`npm run typecheck` PASS; `npm run test:e2e -- input-loop` PASS (all original loop tests still green — no new taps added). If e2e env-skipped: dev server at 375px, log an expense, watch the bar animate.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx tests/e2e/input-loop.spec.ts
git commit -m "feat: budget progress bar and larger amount display on log screen"
```

### Task 7: Secondary screens onto cards

**Files:**
- Modify: `src/app/periods/page.tsx`, `src/app/accounts/page.tsx`, `src/app/savings/page.tsx`, `src/app/categories/page.tsx` (also `AwarenessCard.tsx` / `SnapshotEditor.tsx` if they render floating sections)

**Interfaces:**
- Consumes: `Card` from Task 5.

- [ ] **Step 1: Apply the pattern per page**

Styling only — do not touch handlers, hooks, or JSX structure beyond wrapping. Pattern (worked example from `accounts/page.tsx`): the account list block and the add-account form block each get wrapped:

```tsx
<Card className="mt-4">
  {/* existing list rows; row dividers become border-line */}
</Card>

<Card className="mt-3">
  {/* existing add form; inputs keep their classes */}
</Card>
```

Rules for all four pages:
- Each logical group (list, form, awareness card, editor) sits in one `<Card>`.
- Vertical rhythm between cards: parent gets `space-y-3` (or cards keep `mt-3`) — replace any ad-hoc `mt-6`/`mt-8` mixes inside a page with one consistent gap.
- Row dividers inside cards: `border-line`.
- Page heading + description stay outside cards, directly on the ground.

- [ ] **Step 2: Verify + commit**

`npm run typecheck && npx vitest run && npm run test:e2e` — PASS (cutoff-and-savings e2e exercises these pages; selectors are role/text-based and unaffected by wrappers).
Dev-server eyeball: all four pages, both themes, 375px.

```bash
git add src/app src/components
git commit -m "feat: group secondary-screen sections onto tonal cards"
```

Phase 2 done — merge `feat/reskin-screens` to `main`.

---

# Phase 3 — Navigation: 6 tabs → 4

- [ ] **Phase 3 setup:** `git checkout main && git checkout -b feat/nav-four-tabs`

### Task 8: /more page + navigation e2e spec

**Files:**
- Create: `src/app/more/page.tsx`
- Test: `tests/e2e/navigation.spec.ts` (new)

**Interfaces:**
- Produces: route `/more`. NavBar (Task 9) points its More tab here.

- [ ] **Step 1: Write the failing e2e spec**

`tests/e2e/navigation.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

test.describe("four-tab navigation", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("More page links to Categories", async ({ page }) => {
    await page.goto("/more");
    await expect(page.getByRole("heading", { name: "More" })).toBeVisible();
    await page.getByRole("link", { name: /Categories/ }).click();
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  });

  test("nav shows exactly four tabs", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Log" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Budget" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Money" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "More" })).toBeVisible();
  });

  test("Money tab switches between Accounts and Savings", async ({ page }) => {
    await page.goto("/accounts");
    await page.getByRole("link", { name: "Savings" }).first().click();
    await expect(page).toHaveURL(/\/savings/);
    await page.getByRole("link", { name: "Accounts" }).first().click();
    await expect(page).toHaveURL(/\/accounts/);
  });
});
```

Run: `npm run test:e2e -- navigation` — FAILS (no /more, six tabs).

- [ ] **Step 2: Create `src/app/more/page.tsx`**

```tsx
import Link from "next/link";
import { Card } from "@/components/ui/Card";

/** Small static hub for the rarely-touched screens (Report joins when unparked). */
export default function MorePage() {
  return (
    <section className="pt-6">
      <h1 className="text-lg font-semibold">More</h1>
      <div className="mt-4 space-y-3">
        <Link href="/categories" className="block">
          <Card className="flex items-center justify-between">
            <span className="font-medium">Categories</span>
            <span aria-hidden className="text-ink-muted">›</span>
          </Card>
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify + commit**

`npm run typecheck` PASS. The More-page e2e test passes once Task 9 lands the nav; commit now:

```bash
git add src/app/more/page.tsx tests/e2e/navigation.spec.ts
git commit -m "feat: add /more hub page and navigation e2e spec"
```

### Task 9: Four-tab NavBar with inline SVG icons + active pill

**Files:**
- Modify: `src/components/NavBar.tsx` (full rewrite)

**Interfaces:**
- Consumes: routes `/`, `/periods`, `/accounts`, `/savings`, `/categories`, `/report`, `/more`.
- Produces: the four-tab bar; Money renders active on `/accounts` AND `/savings`; More renders active on `/more`, `/categories`, `/report`.

- [ ] **Step 1: Rewrite `NavBar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Tab {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: ReactNode;
}

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const TABS: readonly Tab[] = [
  {
    href: "/",
    label: "Log",
    isActive: (p) => p === "/",
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  {
    href: "/periods",
    label: "Budget",
    isActive: (p) => p.startsWith("/periods"),
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/accounts",
    label: "Money",
    isActive: (p) => p.startsWith("/accounts") || p.startsWith("/savings"),
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M19 7V5H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 3v16a2 2 0 0 0 2 2h16V7H5" />
        <path d="M16 13h2" />
      </svg>
    ),
  },
  {
    href: "/more",
    label: "More",
    isActive: (p) =>
      p.startsWith("/more") || p.startsWith("/categories") || p.startsWith("/report"),
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

/** Fixed bottom nav — 4 tabs, icon + 11px label, soft pill behind the active icon. */
export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active = t.isActive(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? "text-brand" : "text-ink-muted"
            }`}
          >
            <span
              className={`rounded-full px-4 py-0.5 transition-colors motion-reduce:transition-none ${
                active ? "bg-brand-soft" : ""
              }`}
            >
              {t.icon}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verify**

`npm run typecheck` PASS. `npm run test:e2e -- navigation` — "exactly four tabs" and "More page" tests PASS. `npm run test:e2e -- shell-375` still PASS (it may assert old tab labels — if it does, update those assertions to the four new labels in this commit).

- [ ] **Step 3: Commit**

```bash
git add src/components/NavBar.tsx tests/e2e/shell-375.spec.ts
git commit -m "feat: four-tab nav with inline SVG icons and active pill"
```

### Task 10: Money segmented switch on /accounts and /savings

**Files:**
- Create: `src/components/MoneySwitch.tsx`
- Modify: `src/app/accounts/page.tsx`, `src/app/savings/page.tsx` (mount at top of each `<section>`)

**Interfaces:**
- Consumes: routes `/accounts`, `/savings`.
- Produces: `MoneySwitch()` component (no props).

- [ ] **Step 1: Create `MoneySwitch.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OPTIONS = [
  { href: "/accounts", label: "Accounts" },
  { href: "/savings", label: "Savings" },
] as const;

/** Segmented switch that makes two routes feel like one Money tab — no page merge. */
export function MoneySwitch() {
  const pathname = usePathname();
  return (
    <div className="flex rounded-full bg-surface-sunken p-1">
      {OPTIONS.map((o) => {
        const active = pathname.startsWith(o.href);
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full py-1.5 text-center text-sm transition-colors motion-reduce:transition-none ${
              active ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Mount it**

In both `accounts/page.tsx` and `savings/page.tsx`, first child inside the top-level `<section>` (above the `<h1>`):

```tsx
<MoneySwitch />
```

with the import `import { MoneySwitch } from "@/components/MoneySwitch";`.

- [ ] **Step 3: Verify + close phase**

`npm run typecheck` PASS; `npm run test:e2e -- navigation` — the switch test PASSES; full `npx vitest run && npm run test:e2e` green. Dev-server: deep-link straight to `/savings` — Money tab active, switch shows Savings selected.

```bash
git add src/components/MoneySwitch.tsx src/app/accounts/page.tsx src/app/savings/page.tsx
git commit -m "feat: segmented Accounts/Savings switch under the Money tab"
```

Phase 3 done — merge `feat/nav-four-tabs` to `main`.

---

# Phase 4 — Save feedback, motion & undo

- [ ] **Phase 4 setup:** `git checkout main && git checkout -b feat/save-feedback`

### Task 11: Services — synchronous id from addExpense; deleteExpense

**Files:**
- Modify: `src/services/expenses.ts`

**Interfaces:**
- Produces: `addExpense(periodId, expense, onError?) : string` — **now returns the new doc id synchronously** (pre-generated ref + `setDoc` instead of `addDoc`; identical offline semantics). `deleteExpense(periodId: string, expenseId: string, onError?: (error: unknown) => void): void` — fire-and-forget hard delete.
- Consumes: existing `expensesCol` helper in the same file.

- [ ] **Step 1: Implement**

Replace the `addExpense` body and add `deleteExpense` (imports: swap `addDoc` for `doc, setDoc, deleteDoc`):

```ts
import {
  collection,
  doc,
  query,
  orderBy,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type CollectionReference,
  type Query,
} from "firebase/firestore";

/**
 * Log an expense against the active period (Rule 2).
 *
 * Deliberately NOT async (see original rationale — offline writes must not
 * block). Uses a pre-generated ref + setDoc instead of addDoc so the caller
 * gets the id back synchronously; the undo path needs it before the network
 * ever answers.
 */
export function addExpense(
  periodId: string,
  expense: NewExpense,
  onError?: (error: unknown) => void,
): string {
  const ref = doc(expensesCol(periodId));
  void setDoc(ref, {
    amount: expense.amount,
    categoryId: expense.categoryId,
    date: expense.date ? Timestamp.fromDate(expense.date) : serverTimestamp(),
    note: expense.note?.trim() ?? null,
    createdAt: serverTimestamp(),
  }).catch((error: unknown) => {
    onError?.(error);
  });
  return ref.id;
}

/**
 * Undo a just-logged expense. Hard delete is safe here — nothing references an
 * expense doc (the archive requirement covers categories/accounts/pots, which
 * ARE referenced). Same fire-and-forget contract as addExpense.
 */
export function deleteExpense(
  periodId: string,
  expenseId: string,
  onError?: (error: unknown) => void,
): void {
  void deleteDoc(doc(expensesCol(periodId), expenseId)).catch((error: unknown) => {
    onError?.(error);
  });
}
```

- [ ] **Step 2: Verify no caller breaks**

Run: `rg -n "addExpense" src/` — only `page.tsx` calls it (return value previously ignored; now captured in Task 12). `npm run typecheck && npx vitest run` — PASS.

- [ ] **Step 3: Commit**

```bash
git add src/services/expenses.ts
git commit -m "feat: synchronous expense id from addExpense and fire-and-forget deleteExpense"
```

### Task 12: Save feedback UI — vibrate, Saved ✓, undo toast, last-logged row

**Files:**
- Modify: `src/app/page.tsx`
- Test: `tests/e2e/save-feedback.spec.ts` (new)

**Interfaces:**
- Consumes: `addExpense` (returns `string`), `deleteExpense` from Task 11; `formatPHP` from `@/lib/money`; existing `categories` array for the name lookup.

- [ ] **Step 1: Write the failing e2e spec**

`tests/e2e/save-feedback.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

test.describe("save feedback and undo", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("save flashes confirmation and shows the last-logged row", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("222");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible();
    await expect(page.getByTestId("last-logged")).toContainText("₱222.00");
    // Flash reverts — the loop is ready for the next log.
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 3000 });
    // Field cleared + refocused: the ≤5s loop contract, unchanged.
    await expect(page.getByLabel("Amount")).toHaveValue("");
    await expect(page.getByLabel("Amount")).toBeFocused();
  });

  test("undo removes the expense and restores the total", async ({ page }) => {
    await page.goto("/");
    const spent = page.getByText(/^Spent /);
    const before = await spent.textContent();

    await page.keyboard.type("333");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(spent).not.toHaveText(before ?? "");

    await page.getByTestId("last-logged").getByRole("button", { name: "Undo" }).click();
    await expect(spent).toHaveText(before ?? "");
    await expect(page.getByTestId("last-logged")).toBeHidden();
  });
});
```

Run: `npm run test:e2e -- save-feedback` — FAILS.

- [ ] **Step 2: Implement in `page.tsx`**

New state + handlers (all synchronous — no `await` anywhere):

```tsx
import { addExpense, deleteExpense } from "@/services/expenses";

interface LastLogged {
  id: string;
  amount: number;
  categoryName: string;
}

// inside InputPage:
const [lastLogged, setLastLogged] = useState<LastLogged | null>(null);
const [justSaved, setJustSaved] = useState(false);
const [toastOpen, setToastOpen] = useState(false);
const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  return () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  };
}, []);

/** Still optimistic and synchronous — feedback fires AFTER the local cache write. */
function handleSave() {
  if (!canSave || !period || !categoryId) return;
  setSaveError(null);
  const id = addExpense(period.id, { amount, categoryId }, () =>
    setSaveError("Couldn't sync that one — check Categories and try again."),
  );
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
  setLastLogged({ id, amount, categoryName });

  if ("vibrate" in navigator) navigator.vibrate(12);
  setJustSaved(true);
  if (savedTimer.current) clearTimeout(savedTimer.current);
  savedTimer.current = setTimeout(() => setJustSaved(false), 900);
  setToastOpen(true);
  if (toastTimer.current) clearTimeout(toastTimer.current);
  toastTimer.current = setTimeout(() => setToastOpen(false), 3000);

  setAmountRaw("");
  amountRef.current?.focus();
}

/** Fire-and-forget like the save — never awaited (Global Constraints). */
function handleUndo() {
  if (!lastLogged || !period) return;
  deleteExpense(period.id, lastLogged.id);
  setLastLogged(null);
  setToastOpen(false);
}
```

Last-logged row — insert directly under the budget-progress bar from Task 6:

```tsx
{lastLogged ? (
  <div
    data-testid="last-logged"
    className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2 shadow-sm"
  >
    <p className="text-xs text-ink-muted">
      Last:{" "}
      <span className="font-semibold text-ink">
        {formatPHP(lastLogged.amount)} · {lastLogged.categoryName}
      </span>
    </p>
    <button
      type="button"
      onClick={handleUndo}
      className="text-xs font-bold text-brand"
    >
      Undo
    </button>
  </div>
) : null}
```

Toast — last child of the top-level `<section>`:

```tsx
{toastOpen && lastLogged ? (
  <div
    role="status"
    className="fixed inset-x-4 bottom-24 z-20 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm text-surface shadow-lg"
  >
    <span>
      Logged {formatPHP(lastLogged.amount)} · {lastLogged.categoryName}
    </span>
    <button type="button" onClick={handleUndo} className="font-bold underline">
      Undo
    </button>
  </div>
) : null}
```

(`bg-ink text-surface` self-inverts per theme; the Undo button inherits the toast text color — the ink/surface pair is already in the contrast matrix.)

Save button label:

```tsx
<Button onClick={handleSave} disabled={!canSave} className="w-full py-4 text-lg">
  {justSaved ? "Saved ✓" : "Save"}
</Button>
```

- [ ] **Step 3: Run the new e2e + the sacred loop specs**

Run: `npm run test:e2e -- save-feedback input-loop offline-log`
Expected: ALL PASS — feedback lands, and the original loop specs prove no regression (field clears, refocuses, works offline).

- [ ] **Step 4: Full suite + both-theme eyeball**

`npm run typecheck && npx vitest run && npm run test:e2e` — green. Dev-server, 375px, both themes: log → buzz (device permitting), Saved ✓ flash, toast with Undo, last-logged row; Undo drops the total back. Airplane-mode the browser (DevTools offline): log + undo still instant.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx tests/e2e/save-feedback.spec.ts
git commit -m "feat: save feedback with haptic, confirmation flash, undo toast and last-logged row"
```

Phase 4 done — merge `feat/save-feedback` to `main`. Redesign complete.

---

## Final acceptance sweep (after Phase 4 merges)

- [ ] Log loop: number + chip + Save — zero added taps, field pre-focused, Save in thumb reach with keyboard open.
- [ ] `rg -n "await addExpense|await deleteExpense|async function handleSave" src/` → zero hits.
- [ ] `npx vitest run` → dual-theme contrast matrix green.
- [ ] OS dark-mode toggle: all five routes + chips render correctly in both themes.
- [ ] Installed PWA: deep links to `/savings`, `/categories`, `/more` resolve after `npm run build` (static export output).
- [ ] OS reduced-motion: progress bar, pill, toast, switch — no animation.
