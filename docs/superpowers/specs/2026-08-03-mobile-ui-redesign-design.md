# Design — 2026 Mobile UI Redesign

**Date:** 2026-08-03
**Status:** Approved in brainstorming (all four sections) — pending spec review
**Goal:** Redesign the expense tracker's mobile UI to current (2026) standards and trends without regressing the ≤5-second one-handed logging loop, which remains the product.
**Visual reference:** Mockups from the brainstorming session persist in `.superpowers/brainstorm/177-1785691655/content/` (section1–section4 HTML fragments, gitignored).

---

## Decisions made during brainstorming

| Question | Decision |
|----------|----------|
| Scope | Full 2026 redesign: tokens, dark mode now, save feedback + undo, motion, 6→4 navigation |
| Navigation grouping | Log · Budget · Money · More (Money = Accounts + Savings; More = Categories + parked Report) |
| Dark mode behavior | Follows the phone setting (`prefers-color-scheme`) — no toggle UI |
| Palette | Keep green `#15803d` anchor; warm the neutrals (green-tinted off-white ground, tonal surfaces); derived dark palette |
| Save feedback | Full feedback + Undo: haptic, "Saved ✓" flash, undo toast, last-logged row |
| Build approach | **A — Token-first, phased.** Four independently shippable phases; the live app is never half-redesigned |

## Trends deliberately rejected

Glass/blur surfaces (contrast + mid-range GPU cost), 3D/immersive visuals (load time on a must-open-instantly PWA), AI personalization (requires a backend this app deliberately lacks), gesture-only navigation (fails the two non-technical users). These are out of scope permanently, not deferred.

---

## Section 1 — Design tokens & dark theme (Phase 1)

**What:** Move every color from hardcoded Tailwind values to CSS variables; add a derived dark palette.

- `globals.css` defines all color tokens on `:root` (light) and overrides them under `@media (prefers-color-scheme: dark)`. `color-scheme: light dark` replaces today's light-only declaration.
- `tailwind.config.ts` maps existing token names (`brand`, `ink`, `ink-muted`, `surface`, `surface-sunken`, `ok`, `warn`) to `var(--…)` — component class names do not change.
- Light palette: keep `#15803d` brand anchor; neutrals warm up subtly (green-tinted off-white ground, tonal card surface) instead of pure `#ffffff` / slate.
- Dark palette: derived, not inverted — brighter green for the accent so it carries on dark ground (with dark text on it, not white), dark green-tinted surfaces, re-derived text scale.
- Mockup direction (final hexes tuned until tests pass): light ground `#f3f6f1`, sunken `#e7ede4`, ink `#122018`, ink-muted `#47604f`; dark ground `#0f1712`, card `#182420`, sunken `#1f2d26`, accent `#4ade80` with `#052e16` text, ink `#e8f0ea`, ink-muted `#9fb3a6`.
- **Contrast is tested, not asserted in comments alone:** `tests/unit/contrast.test.ts` extends to assert every token pair at ≥4.5:1 in *both* themes, same WCAG 2.x relative-luminance method as today.
- Category chip colors arrive from Firestore as data; `lib/contrast.ts` `readableTextOn` continues to decide chip text color per chip, which is theme-safe by construction.
- PWA shell: `manifest.json` and the Next `themeColor` viewport export gain per-scheme values so the installed app's chrome matches in both themes.

**Ships looking pixel-close to today in light mode.** Pure plumbing + the dark theme. This phase's risk is near zero and it unblocks everything after it.

## Section 2 — Screen re-skin (Phase 2)

**What:** Apply a consistent visual rhythm on top of the tokens. Styling only — zero layout restructuring, zero new taps.

- Radius scale: cards 14px, primary buttons 18px, chips full-round (as today).
- Spacing rhythm: consistent section gaps via flex/grid `gap`, replacing ad-hoc margins where found.
- Secondary screens (Periods, Accounts, Savings, Categories): forms and lists group onto tonal card surfaces instead of floating on the page ground.
- Log screen: budget progress bar under "Remaining" (spent/budget, animates width on change), amount display steps up from `text-5xl` to `text-6xl` with tighter letter-spacing. Everything else stays in place.

## Section 3 — Navigation: 6 tabs → 4 (Phase 3)

**What:** `NavBar.tsx` becomes Log · Budget · Money · More.

- Inline SVG icons (no icon library), 11px labels (up from 10px), soft pill highlight behind the active tab's icon (current Material 3 Expressive pattern).
- Tab → route mapping: Log → `/`, Budget → `/periods`, Money → `/accounts`, More → new `/more`.
- **Money is one tab over two existing routes:** `/accounts` and `/savings` each get a small segmented switch (Accounts | Savings) at the top; the Money tab renders active for both routes. No page merging, no data-flow changes, all existing routes and deep links keep working.
- `/more` is a small static page linking to Categories (and Report when unparked).

## Section 4 — Save feedback, motion & tests (Phase 4)

**What:** The save moment gets feedback; motion is tuned as feedback, not decoration.

- On save: `navigator.vibrate(12)` where supported; Save button flashes "Saved ✓" (~900ms); toast "Logged ₱250 · Food" with **Undo** (auto-dismiss ~3s); a "last logged" row (amount · category · Undo) appears under the header.
- **Undo hard-deletes that single expense.** Safe under the archive-don't-delete rule: nothing references an expense doc. New `deleteExpense(periodId, expenseId)` in `services/expenses.ts`, synchronous fire-and-forget against the local cache exactly like `addExpense` — never `await`ed in the UI.
- **The write path is untouched.** All feedback is triggered after the synchronous cache write; nothing waits on the network. `handleSave` stays non-async.
- Motion: chip/button press springs and toast/bar transitions all <200ms, all with `motion-reduce:` variants; the global reduced-motion escape hatch already exists.
- Tests: contrast suite (both themes, Phase 1); Playwright — log loop unchanged (number + chip + Save, offline included), Money segmented switch, More page reachability, undo removes the expense and updates the total.

---

## Phase → PR mapping (approach A)

| Phase | Branch | Ships |
|------|--------|-------|
| 1 | `feat/design-tokens-dark-mode` | CSS-variable tokens, dark palette, dual-theme contrast tests, PWA theme colors |
| 2 | `feat/reskin-screens` | Radius/spacing rhythm, card surfaces, Log progress bar |
| 3 | `feat/nav-four-tabs` | 4-tab NavBar with icons + pill, segmented Money switch, `/more` |
| 4 | `feat/save-feedback` | Vibration, Saved ✓, undo toast, last-logged row, `deleteExpense`, e2e coverage |

Each phase passes `npm run typecheck`, `npm test`, and `npm run test:e2e` before merge and leaves the app fully usable.

## Acceptance criteria (whole redesign)

1. Logging an expense is still: number + chip tap + Save — zero added taps, amount field still pre-focused, Save still in thumb reach with keyboard open (`dvh` layout preserved).
2. All writes still succeed offline and reconcile on reconnect; no `await` added anywhere on the log/undo path.
3. Every color pair passes 4.5:1 in both themes, enforced by unit tests.
4. Dark mode follows the phone setting with no broken surfaces (including category chips with data-driven colors).
5. All existing routes still resolve (static export, installed-PWA deep links).
6. `prefers-reduced-motion` disables all added motion.

## Out of scope

Report screen content (still parked), real auth, screen-structure rethinks (merged Money *page*, bottom-sheet flows), CSV export, any backend. Category color palette curation is untouched — chips render whatever Firestore holds.
