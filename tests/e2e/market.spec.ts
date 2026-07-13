import { expect, test } from "@playwright/test";
import { itemFixture, itemsFixture, ordersFixture, topOrdersFixture } from "../../src/test/fixtures/api";

test("searches, opens prices, favorites, and persists after reload", async ({ page }) => {
  await page.route("**/api/wfm**", async (route) => {
    const url = route.request().url();
    const body = url.endsWith("/items")
      ? itemsFixture
      : url.endsWith("/items/lex_prime_set")
        ? itemFixture
        : url.endsWith("/orders/item/lex_prime_set/top")
          ? topOrdersFixture
          : ordersFixture;
    await route.fulfill({ json: body });
  });

  await page.goto("/");
  await page.getByRole("combobox").fill("lex");
  await page.getByRole("option", { name: /lex prime set/i }).click();
  await expect(page.getByRole("heading", { name: /lex prime set/i })).toBeVisible();
  await expect(page.getByText("5 pt").first()).toBeVisible();
  await expect(page.getByText("3 pt").first()).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lex Prime Set").first()).toBeVisible();
  await expect(page.getByText("5 pt").first()).toBeVisible();
});
