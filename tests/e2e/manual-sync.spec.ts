import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

/**
 * Verifies the manual sync control (spec:
 * docs/superpowers/specs/2026-08-03-manual-sync-control-design.md).
 *
 * Tests the mechanism (tap → transient state → return to idle), not the
 * cross-device staleness scenario — that's outside Playwright's scope.
 */
test.describe("manual sync control", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("shows 'Up to date ✓' after a successful sync on the Log page", async ({ page }) => {
    await page.goto("/");
    const pill = page.getByRole("button", { name: /Synced|Offline/ });
    await expect(pill).toBeVisible();

    await pill.click();
    // Transient success flash — assert within the 1.5s window.
    await expect(page.getByRole("button", { name: "Up to date ✓" })).toBeVisible();
    // Then back to Synced.
    await expect(page.getByRole("button", { name: "Synced" })).toBeVisible({
      timeout: 3000,
    });
  });

  test("shows 'Still offline' when tapped while offline", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await expect(page.getByRole("button", { name: "Offline — saved locally" })).toBeVisible();

    await page.getByRole("button", { name: "Offline — saved locally" }).click();
    await expect(page.getByRole("button", { name: "Still offline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Offline — saved locally" })).toBeVisible({
      timeout: 3000,
    });

    await context.setOffline(false);
  });

  test("pill appears on Periods, Accounts, and Savings headers", async ({ page }) => {
    for (const path of ["/periods", "/accounts", "/savings"]) {
      await page.goto(path);
      await expect(
        page.getByRole("button", { name: /Synced|Offline/ }),
      ).toBeVisible();
    }
  });
});
