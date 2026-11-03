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
  await page.getByRole("button", { name: "Confirm: Approve" }).click();
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

test("metric drill-downs open filtered views", async ({ page }) => {
  await asRole(page, "command", "/hq/command");
  await page.getByRole("navigation", { name: "Department metrics" }).getByRole("link", { name: /On duty now/ }).click();
  await expect(page).toHaveURL(/\/hq\/roster\?duty=1/);
  await expect(page.getByRole("table", { name: "Personnel" }).locator("tbody tr")).toHaveCount(4);
  await page.goto("/hq/command");
  await page.getByRole("navigation", { name: "Department metrics" }).getByRole("link", { name: /Pending decisions/ }).click();
  const table = page.getByRole("table", { name: "Decision queue" });
  await expect(table.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("link", { name: /North District/ }).first().click();
  await expect(page).toHaveURL(/district=North/);
});

test("a decision on a request changed by another reviewer is refused", async ({ page, context }) => {
  await asRole(page, "command", "/hq/command?id=REQ-1052");
  const sheet = page.getByRole("dialog", { name: "Activity correction" });
  await expect(sheet).toBeVisible();
  // A second reviewer (another tab, same browser profile) asks for clarification first.
  const other = await context.newPage();
  await other.goto("/hq/command?id=REQ-1052");
  const otherSheet = other.getByRole("dialog", { name: "Activity correction" });
  await otherSheet.getByRole("button", { name: "Ask for info" }).click();
  await otherSheet.getByLabel("Reason").fill("Which session is this for?");
  await other.getByRole("button", { name: "Record: Ask for info" }).click();
  await other.getByRole("button", { name: "Confirm: Ask for info" }).click();
  await expect(otherSheet.getByText("“Which session is this for?”")).toBeVisible(); // the recorded history note

  await other.close();
  await expect(sheet.getByText("This request changed while you had it open")).toBeVisible();
  await sheet.getByRole("button", { name: "Approve" }).click();
  await sheet.getByLabel("Reason").fill("Approving without seeing the update");
  await expect(page.getByRole("button", { name: "Record: Approve" })).toBeDisabled();
});
