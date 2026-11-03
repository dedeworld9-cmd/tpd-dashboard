import { expect, test } from "@playwright/test";

test("homepage shows the disclaimer, badge and real links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Not a real police agency/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Tampa Police Department" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Tampa Police Department badge" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Apply to join/ }).first()).toHaveAttribute("href", "https://forms.gle/EG78MZdQdgMdLoYX8");
  for (const id of ["about", "join", "districts", "divisions", "leadership", "policies"]) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.getByText(/not affiliated with the City of Tampa/)).toBeVisible();
});
