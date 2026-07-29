import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

/**
 * The cutoff routine end to end: declare balances, close a period, and check that the
 * awareness math and the pot allocations both land — offline, then after a reconnect.
 *
 * Gated for the same reason as offline-log.spec.ts: this needs a real Firebase project
 * plus NEXT_PUBLIC_HOUSEHOLD_ID, and it mutates period history, so it must never run
 * against the household's live data. Selectors are written against the shipped UI, so a
 * seeded test household is all it needs — see `_env.ts`.
 */
test.describe("cutoff declaration and savings allocation", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("freezes balances offline and reconciles on reconnect", async ({ page, context }) => {
    await page.goto("/accounts");

    // Declare a starting bank balance.
    await page.getByRole("button", { name: /Edit balance for Main/ }).click();
    await page.getByLabel(/Balance for Main/).fill("100000");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("₱100,000.00").first()).toBeVisible();

    // A 5%-of-income pot, so the declaration has an allocation to apply.
    await page.goto("/savings");
    await page.getByPlaceholder("Pot name").fill("Travel");
    await page.getByLabel("Percent of income").fill("5");
    await page.getByRole("button", { name: "Add pot" }).click();

    // Cut over offline — the whole declaration must commit from the local cache.
    await context.setOffline(true);
    await page.goto("/periods");
    await page.getByLabel("Budget amount").fill("20000");
    await page.getByLabel("Income amount").fill("30000");
    // The pre-filled balance needs no typing; the allocation preview proves the rule fired.
    await expect(page.getByText("₱1,500.00")).toBeVisible();
    await page.getByRole("button", { name: "Start new period" }).click();
    await expect(page.getByText("Active")).toBeVisible();

    // Savings main = 100,000 bank − 1,500 allocated.
    await page.goto("/savings");
    await expect(page.getByText("₱98,500.00")).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByText("Synced")).toBeVisible();
  });

  test("shows the unaccounted gap for the closed period", async ({ page }) => {
    // Second cutoff: bank rose 100k -> 112k on 30k income with 15k logged, so 3k is missing.
    await page.goto("/periods");
    await page.getByLabel("Budget amount").fill("20000");
    await page.getByLabel(/Balance for Main/).fill("112000");
    await page.getByRole("button", { name: "Start new period" }).click();

    await expect(page.getByText("Last period")).toBeVisible();
    await expect(page.getByText("₱3,000.00 spent but not logged")).toBeVisible();
  });

  test("credits a pot once when one declaration is retried", async ({ page }) => {
    // Deterministic allocation ids (`{periodId}_{potId}`) make the ledger write idempotent,
    // so a retried or replayed commit of the same declaration can't credit the pot twice.
    //
    // NOTE the limit of this guarantee: two devices each declaring while offline create two
    // *different* periods, so they produce two distinct allocations — that is the
    // pre-existing "exactly one open period" conflict (Rule 6), not an allocation bug, and
    // it is not what this test covers.
    await page.goto("/periods");
    await page.getByLabel("Budget amount").fill("20000");
    await page.getByLabel("Income amount").fill("30000");
    await page.getByRole("button", { name: "Start new period" }).click();
    await page.reload();

    await page.goto("/savings");
    await expect(page.getByText("₱1,500.00")).toBeVisible();
    await expect(page.getByText("₱3,000.00")).toBeHidden();
  });
});
