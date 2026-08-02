import { test, expect } from "@playwright/test";
import { LOG_BUDGET_MS, firebaseSkipReason, hasFirebaseEnv } from "./_env";

/**
 * The input-loop spec the acceptance criteria referenced but that did not exist.
 *
 * It asserts the prime directive directly: a number, a chip tap and Save, with
 * the field cleared and refocused, inside the budget. It is also the regression
 * guard for the offline save-path fix — before that fix the button stuck on
 * "Saving…" and the field never cleared, so `expect(field).toHaveValue("")`
 * would hang here rather than in production.
 */
test.describe("fast expense input", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("logs an expense within the time budget and resets for the next one", async ({ page }) => {
    await page.goto("/");

    const amount = page.getByLabel("Amount");
    await expect(amount).toBeFocused(); // pre-focused: no tap to start typing

    const started = Date.now();
    await page.keyboard.type("125");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Save" }).click();

    // Cleared and refocused straight away — this is the optimistic reset, and it
    // must not wait on a server acknowledgement.
    await expect(amount).toHaveValue("");
    await expect(amount).toBeFocused();
    expect(Date.now() - started).toBeLessThanOrEqual(LOG_BUDGET_MS);
  });

  test("save stays disabled until there is an amount", async ({ page }) => {
    await page.goto("/");
    const save = page.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();
    await page.keyboard.type("40");
    await expect(save).toBeEnabled();
  });

  test("the running total reflects the log without a reload", async ({ page }) => {
    await page.goto("/");
    const spent = page.getByText(/^Spent /);
    const before = await spent.textContent();

    await page.keyboard.type("75");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Save" }).click();

    // Derived from the cache listener, so it updates with no round trip.
    await expect(spent).not.toHaveText(before ?? "");
  });

  test("shows budget progress under the header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("budget-progress")).toBeVisible();
  });
});
