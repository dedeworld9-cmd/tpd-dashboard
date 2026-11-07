import { expect, test } from "@playwright/test";
import { asRole } from "./helpers";

test("command palette searches personnel and navigates", async ({ page }) => {
  await asRole(page, "officer");
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox", { name: "Search commands" });
  await expect(input).toBeFocused();
  await input.fill("abern");
  await expect(page.getByRole("option", { name: /J\. Abernathy/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/hq\/roster\?member=m-06/);
});

test("palette hides Command Center from officers and shows it to command", async ({ page }) => {
  await asRole(page, "officer");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search commands" }).fill("command center");
  await expect(page.getByRole("option", { name: /Command Center/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await asRole(page, "command");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search commands" }).fill("command center");
  await expect(page.getByRole("option", { name: /Command Center/ }).first()).toBeVisible();
});

test("go-to shortcuts and the shortcut sheet work", async ({ page }) => {
  await asRole(page, "officer");
  await page.keyboard.press("g");
  await page.keyboard.press("p");
  await expect(page).toHaveURL(/\/hq\/patrol$/);
  await page.keyboard.press("?");
  await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();
});

test("sidebar collapse persists across reloads", async ({ page }) => {
  await asRole(page, "officer");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
});

test("new request is submitted and opened in Requests", async ({ page }) => {
  await asRole(page, "officer");
  await page.keyboard.press("n");
  const dialog = page.getByRole("dialog", { name: "New request" });
  await dialog.getByLabel("Summary").fill("10 days · exams");
  await dialog.getByLabel("Details for the reviewer").fill("Final exams for ten days.");
  await dialog.getByRole("button", { name: "Submit request" }).click();
  await expect(page).toHaveURL(/\/hq\/requests\?id=REQ-/);
  await expect(page.getByRole("dialog").getByText("10 days · exams")).toBeVisible();
});

test("notifications can be marked read", async ({ page }) => {
  await asRole(page, "supervisor");
  const bell = page.getByRole("button", { name: /Notifications, \d+ unread/ });
  await bell.click();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});
