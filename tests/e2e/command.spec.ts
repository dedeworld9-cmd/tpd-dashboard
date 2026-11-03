import { expect, test } from "@playwright/test";
import { asRole } from "./helpers";

test("officers see an access-denied state", async ({ page }) => {
  await asRole(page, "officer", "/hq/command");
  await expect(page.getByRole("heading", { name: "Command Center is restricted" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Decision queue" })).toHaveCount(0);
});

test("command decides a request with a reason and the queue updates", async ({ page }) => {
  await asRole(page, "command", "/hq/command");
  const table = page.getByRole("table", { name: "Decision queue" });
  await table.getByRole("button", { name: /Division application/ }).click();
  const sheet = page.getByRole("dialog", { name: "Division application" });
  await expect(sheet.getByText("Division command, Lieutenant or above (interim)")).toBeVisible();
  await sheet.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: "Record: Approve" }).click();
  await expect(sheet.getByRole("alert")).toContainText("reason");
  await sheet.getByLabel("Reason").fill("Holds no other subdivisions; TIU has space.");
  await page.getByRole("button", { name: "Record: Approve" }).click();
  await expect(sheet.getByText("This request is approved")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(table.getByText("REQ-1049")).toHaveCount(0);
  await page.getByRole("button", { name: "All requests" }).click();
  await expect(table.getByRole("row", { name: /REQ-1049/ }).getByText("Approved")).toBeVisible();
});

test("queue filters, saved views and sorting work", async ({ page }) => {
  await asRole(page, "command", "/hq/command");
  const table = page.getByRole("table", { name: "Decision queue" });
  await page.getByRole("button", { name: "All requests" }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByLabel("District").selectOption("South");
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Save view" }).click();
  await page.getByLabel("View name").fill("South");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "South", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(3);
  await table.getByRole("button", { name: "Member" }).click();
  await expect(table.getByRole("columnheader", { name: /Member/ })).toHaveAttribute("aria-sort", "ascending");
});

test("supervisors cannot decide LOA extensions (HB §5.4)", async ({ page }) => {
  await asRole(page, "supervisor", "/hq/requests?id=REQ-1051");
  const sheet = page.getByRole("dialog", { name: "LOA extension" });
  await expect(sheet.getByText("You can’t decide this request")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Approve" })).toHaveCount(0);
});
