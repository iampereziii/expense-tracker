import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

test.describe("four-tab navigation", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("More page links to Categories", async ({ page }) => {
    await page.goto("/more");
    await expect(page.getByRole("heading", { name: "More" })).toBeVisible();
    await page.getByRole("link", { name: /Categories/ }).click();
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  });

  test("nav shows exactly four tabs", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link")).toHaveCount(4);
    await expect(nav.getByRole("link", { name: "Log" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Budget" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Money" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "More" })).toBeVisible();
  });

  test("Money tab switches between Accounts and Savings", async ({ page }) => {
    await page.goto("/accounts");
    await page.getByRole("link", { name: "Savings" }).first().click();
    await expect(page).toHaveURL(/\/savings/);
    await page.getByRole("link", { name: "Accounts" }).first().click();
    await expect(page).toHaveURL(/\/accounts/);
  });
});
