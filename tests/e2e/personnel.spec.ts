import { expect, test } from "@playwright/test";
import { asRole } from "./helpers";

test("command promotes a member after reviewing consequences", async ({ page }) => {
  await asRole(page, "command", "/hq/roster?member=m-09");
  const sheet = page.getByRole("dialog", { name: "Personnel record" });
  await sheet.getByRole("button", { name: /Manage/ }).click();
  await page.getByRole("menuitem", { name: /Change rank/ }).click();
  const dialog = page.getByRole("dialog", { name: /Change rank: L\. Brennan/ });
  await dialog.getByLabel("New rank").selectOption("Sergeant");
  await expect(dialog.getByText("Gains access: Supervisor desk")).toBeVisible();
  await expect(dialog.getByText(/Authorized to drive the 2019 FPIU/)).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm promotion" }).click();
  await expect(dialog.getByRole("alert")).toContainText("reason");
  await dialog.getByLabel("Reason").fill("Promotion board approved.");
  await dialog.getByRole("button", { name: "Confirm promotion" }).click();
  await expect(page.getByText(/L\. Brennan: promotion recorded/)).toBeVisible();
  await expect(sheet.getByRole("listitem").filter({ hasText: "Promotion: Officer → Sergeant" })).toBeVisible();
});

test("administrators cannot change their own record; officers see no admin menu", async ({ page }) => {
  await asRole(page, "command", "/hq/roster?member=m-03");
  await page.getByRole("dialog", { name: "Personnel record" }).getByRole("button", { name: /Manage/ }).click();
  await expect(page.getByRole("menuitem", { name: /Change rank/ })).toHaveAttribute("aria-disabled", "true");
  await asRole(page, "officer", "/hq/roster?member=m-09");
  await expect(page.getByRole("dialog", { name: "Personnel record" }).getByRole("button", { name: /Manage/ })).toHaveCount(0);
});

test("roster filters narrow the table", async ({ page }) => {
  await asRole(page, "officer", "/hq/roster");
  const table = page.getByRole("table", { name: "Personnel" });
  await page.getByLabel("District").selectOption("South");
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await page.getByLabel("Search personnel").fill("varga");
  await expect(table.locator("tbody tr")).toHaveCount(1);
});

test("division application respects membership", async ({ page }) => {
  await asRole(page, "officer", "/hq/divisions/waterfront");
  await expect(page.getByRole("button", { name: "Apply to join" })).toBeDisabled();
  await page.goto("/hq/divisions/swat");
  await page.getByRole("button", { name: "Apply to join" }).click();
  await expect(page.getByRole("dialog", { name: "New request" }).getByLabel("Type")).toHaveValue("Division application");
});

test("supervisor desk is gated", async ({ page }) => {
  await asRole(page, "officer", "/hq/supervisor");
  await expect(page.getByRole("heading", { name: "Supervisor desk is restricted" })).toBeVisible();
  await asRole(page, "supervisor", "/hq/supervisor");
  await expect(page.getByRole("heading", { name: "Supervisor desk", exact: true })).toBeVisible();
});

test("every HQ page renders without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await asRole(page, "command");
  for (const path of ["/hq", "/hq/patrol", "/hq/activity", "/hq/training", "/hq/roster", "/hq/roster/m-07", "/hq/divisions", "/hq/divisions/swat", "/hq/requests", "/hq/resources", "/hq/supervisor", "/hq/command", "/hq/settings"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
