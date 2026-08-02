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
