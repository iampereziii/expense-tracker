import { DARK, LIGHT } from "@/lib/tokens";

/** Light brand — manifest + light browser chrome. tests/unit/theme.test.ts pins the copies. */
export const BRAND_COLOR = LIGHT.brand;

/** Chip-text dark option in readableTextOn; matches the light ink token. */
export const INK_COLOR = LIGHT.ink;

/** Installed-app chrome in dark mode matches the dark card surface. */
export const THEME_COLOR_DARK = DARK.surface;
