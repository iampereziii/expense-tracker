import { test, expect } from "@playwright/test";
import { LOG_BUDGET_MS, firebaseSkipReason, hasFirebaseEnv } from "./_env";

/**
 * The gating acceptance test (project-spec Rule 5 / F2): an expense logged with
 * the network offline must succeed instantly and survive a reconnect.
 *
 * Gated on a seeded test household rather than unconditionally skipped — see
 * `_env.ts`. It runs wherever credentials exist; it no longer passes vacuously
 * where they don't.
 */
test.describe("offline logging", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("logs an expense offline and syncs on reconnect", async ({ page, context }) => {
    await page.goto("/");

    // Amount field is pre-focused — type without tapping first.
    const amount = page.getByLabel("Amount");
    await expect(amount).toBeFocused();
    await page.keyboard.type("125");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();

    await context.setOffline(true);
    await expect(page.getByText("Offline — saved locally")).toBeVisible();

    const started = Date.now();
    await page.getByRole("button", { name: "Save" }).click();

    // The regression this guards: awaiting the Firestore write meant the promise
    // never settled offline, so the field never cleared and the button stuck
    // disabled. Offline must be indistinguishable from online on the write path.
    await expect(amount).toHaveValue("");
    await expect(amount).toBeFocused();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled(); // empty, not busy
    expect(Date.now() - started).toBeLessThanOrEqual(LOG_BUDGET_MS);

    await context.setOffline(false);
    await expect(page.getByText("Synced")).toBeVisible();
  });
});
