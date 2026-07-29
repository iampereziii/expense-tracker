/**
 * The one place the brand hex is written down.
 *
 * It previously lived in three places — `tailwind.config.ts`, the `viewport`
 * export in `layout.tsx`, and `public/manifest.json` — which is three chances to
 * ship a theme colour that disagrees with the buttons. `layout.tsx` imports from
 * here; `manifest.json` is static JSON so it cannot, and
 * `tests/unit/theme.test.ts` fails if either the manifest or the Tailwind token
 * drifts from this value.
 */
export const BRAND_COLOR = "#15803d";

/** Body text on white. Also the dark option in {@link readableTextOn}. */
export const INK_COLOR = "#0f172a";
