import { test, expect } from "@playwright/test";

/**
 * The gating acceptance test (project-spec Rule 5 / F2): an expense logged with
 * the network offline must succeed instantly and survive a reconnect.
 *
 * Skipped until a Firebase project + NEXT_PUBLIC_HOUSEHOLD_ID are wired and a
 * seeded period exists. Flesh out the selectors against the running app.
 */
test.skip("logs an expense offline and syncs on reconnect", async ({ page, context }) => {
  await page.goto("/");

  // Amount field is pre-focused — type without tapping first.
  await page.keyboard.type("125");
  await page.getByRole("button", { name: "Food" }).click();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Save" }).click();

  // Saved instantly from local cache even though we're offline.
  await expect(page.getByText("Offline — saved locally")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("Synced")).toBeVisible();
});
