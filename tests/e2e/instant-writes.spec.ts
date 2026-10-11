import { test, expect } from "@playwright/test";
import { firebaseSkipReason, hasFirebaseEnv } from "./_env";

/**
 * Category / account / pot writes must not wait on the server. Before this was
 * fixed the pages awaited addDoc, which only resolves on a server ack — so
 * offline the input never cleared and the Add button stayed disabled, even
 * though the new row was already in the local cache.
 */
test.describe("instant writes", () => {
  test.skip(!hasFirebaseEnv, firebaseSkipReason);

  test("adding a category offline shows it at once and clears the input", async ({
    page,
    context,
  }) => {
    await page.goto("/categories/");
    const name = `Test ${Date.now()}`;
    await context.setOffline(true);

    const input = page.getByPlaceholder("New category");
    await input.fill(name);
    await page.getByRole("button", { name: "Add" }).click();

    await expect(input).toHaveValue("", { timeout: 1_000 });
    await expect(page.getByRole("listitem").filter({ hasText: name })).toBeVisible();

    // Clean up through the same instant path: archive, and it leaves the list at once.
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("listitem")
      .filter({ hasText: name })
      .getByRole("button", { name: "Remove" })
      .click();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);

    await context.setOffline(false);
  });

  test("adding an account offline clears the input at once", async ({ page, context }) => {
    await page.goto("/accounts/");
    await context.setOffline(true);
    const input = page.getByPlaceholder("Account name");
    await input.fill(`Test ${Date.now()}`);
    await page.getByRole("button", { name: "Add account" }).click();
    await expect(input).toHaveValue("", { timeout: 1_000 });
    await context.setOffline(false);
  });
});
