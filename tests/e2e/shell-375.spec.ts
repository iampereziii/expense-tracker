import { test, expect } from "@playwright/test";

/**
 * The regression net for the visual polish pass.
 *
 * Unlike the data-dependent specs, this one needs no Firebase project — it
 * exercises the app shell, which is what a whole-app restyle actually endangers:
 * touch target sizes, one-handed reach, and the page not gaining a horizontal
 * scrollbar because a token widened something. This is the automated protection
 * the polish pass previously did not have.
 *
 * SC 2.5.8 Target Size (Minimum) — 24×24 CSS px — is the WCAG 2.2 **AA** bar.
 * 44×44 is SC 2.5.5 at AAA and is deliberately not asserted here; see challenge
 * finding #4.
 */
const AA_TARGET_MIN_PX = 24;

/** All navigable routes — used for horizontal-scroll regression. Includes deep-linked
 *  pages (/savings, /categories, /report) that aren't nav targets but must not scroll. */
const ROUTES = [
  "/",
  "/periods",
  "/accounts",
  "/savings",
  "/categories",
  "/report",
  "/more",
] as const;

/** Number of anchors rendered in the bottom nav (Log / Budget / Money / More). */
const NAV_TAB_COUNT = 4;

test.describe("app shell at the specified breakpoint", () => {
  test("bottom nav exposes every route with AA-sized targets", async ({ page }) => {
    await page.goto("/");

    const tabs = page.locator("nav a");
    await expect(tabs).toHaveCount(NAV_TAB_COUNT);

    for (const tab of await tabs.all()) {
      const box = await tab.boundingBox();
      expect(box, "nav tab should be laid out").not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(AA_TARGET_MIN_PX);
      expect(box!.width).toBeGreaterThanOrEqual(AA_TARGET_MIN_PX);
    }
  });

  test("nav stays reachable and on-screen", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    // Fixed to the bottom edge — the whole point of the pattern.
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
  });

  for (const route of ROUTES) {
    test(`${route} does not scroll horizontally`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // A token change that widens content past the viewport is a regression:
      // horizontal scroll breaks one-handed use immediately.
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("pinch-zoom is not blocked", async ({ page }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .first()
      .getAttribute("content");
    expect(content).not.toBeNull();
    // SC 1.4.4 Resize Text (AA): `maximum-scale=1` / `user-scalable=no` fail it.
    expect(content!).not.toMatch(/maximum-scale\s*=\s*1\b/);
    expect(content!).not.toMatch(/user-scalable\s*=\s*(no|0)/);
  });

  test("theme colour matches the manifest", async ({ page, request }) => {
    await page.goto("/");
    const meta = await page.locator('meta[name="theme-color"]').first().getAttribute("content");
    const manifest = await (await request.get("/manifest.json")).json();
    expect(meta?.toLowerCase()).toBe(String(manifest.theme_color).toLowerCase());
  });
});
