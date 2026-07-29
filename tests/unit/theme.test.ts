import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindConfig from "../../tailwind.config";
import { BRAND_COLOR, INK_COLOR } from "@/lib/theme";

/**
 * The brand hex used to be written in three independent places. These tests are
 * what make `lib/theme.ts` the actual single source rather than a third copy:
 * `manifest.json` is static JSON and the Tailwind config is build-time data, so
 * neither can import it — but both can be asserted against it.
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

  it("matches the PWA manifest theme_color", () => {
    expect(manifest).toMatchObject({ theme_color: BRAND_COLOR });
  });

  it("matches the Tailwind brand token", () => {
    expect(colorAt(["brand", "DEFAULT"])).toBe(BRAND_COLOR);
  });

  it("matches the Tailwind ink token", () => {
    expect(colorAt(["ink", "DEFAULT"])).toBe(INK_COLOR);
  });
});
