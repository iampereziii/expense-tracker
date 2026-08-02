import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

test.describe("save feedback and undo", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("save flashes confirmation and shows the last-logged row", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.type("222");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible();
    await expect(page.getByTestId("last-logged")).toContainText("₱222.00");
    // Flash reverts — the loop is ready for the next log.
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible({ timeout: 3000 });
    // Field cleared + refocused: the ≤5s loop contract, unchanged.
    await expect(page.getByLabel("Amount")).toHaveValue("");
    await expect(page.getByLabel("Amount")).toBeFocused();
  });

  test("undo removes the expense and restores the total", async ({ page }) => {
    await page.goto("/");
    const spent = page.getByText(/^Spent /);
    const before = await spent.textContent();

    await page.keyboard.type("333");
    await page.getByRole("group", { name: "Category" }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(spent).not.toHaveText(before ?? "");

    await page.getByTestId("last-logged").getByRole("button", { name: "Undo" }).click();
    await expect(spent).toHaveText(before ?? "");
    await expect(page.getByTestId("last-logged")).toBeHidden();
  });
});
