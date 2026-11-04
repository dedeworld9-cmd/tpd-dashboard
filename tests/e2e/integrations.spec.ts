import { expect, test } from "@playwright/test";

// Default build: no backend configured. Everything must say so; nothing may claim to be connected.
test.describe("without a backend", () => {
  test.skip(!!process.env.E2E_FAKE_BACKEND, "fake-backend build");

  test("sign-in explains that Discord sign-in is not configured", async ({ page }) => {
    await page.goto("/hq/sign-in");
    await expect(page.getByText("Sign-in is not configured yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with Discord" })).toHaveCount(0);
  });

  test("integrations panel shows honest statuses", async ({ page }) => {
    await page.goto("/hq/command/integrations");
    await expect(page.getByRole("heading", { level: 1, name: "Integrations" })).toBeVisible();
    await expect(page.getByText("No backend is connected to this site")).toBeVisible();
    await expect(page.getByText("Not configured", { exact: true })).toHaveCount(3);
    await expect(page.getByText("Connected", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Sync patrol time with CAD duty status")).toBeVisible();
  });
});

// Built with NEXT_PUBLIC_SUPABASE_URL=https://fakeproj.supabase.co and a dummy anon key;
// Supabase responses are stubbed in the browser to exercise each membership state.
test.describe("with a backend (stubbed)", () => {
  test.skip(!process.env.E2E_FAKE_BACKEND, "needs the fake-backend build");

  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-0000-0000-0000000000aa", exp: 4102444800, role: "authenticated" })}.sig`;
  const session = {
    access_token: jwt,
    refresh_token: "r",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 4102444800,
    user: { id: "00000000-0000-0000-0000-0000000000aa", aud: "authenticated", role: "authenticated", app_metadata: { provider: "discord" }, user_metadata: {}, created_at: "2026-11-04T00:00:00Z" },
  };
  const member = {
    name: "A. Example",
    callsign: "X-425",
    rank: "Officer",
    appointment: "Patrol Bureau",
    tier: "Patrol Bureau",
    district: "North",
    timezone: null,
    status: "active",
    divisions: [{ division: "waterfront", callsign: "W-12", role: "Officer", title: "Waterfront Unit" }],
  };

  async function as(page: import("@playwright/test").Page, membership: object | null, status = 200) {
    await page.route("https://fakeproj.supabase.co/**", (route) => {
      const url = route.request().url();
      if (url.includes("/rest/v1/rpc/my_membership")) return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(membership) });
      if (url.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session.user) });
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.addInitScript((s) => localStorage.setItem("tpd-auth", JSON.stringify(s)), membership === null ? null : session);
  }

  test("signed out: offers Discord sign-in", async ({ page }) => {
    await as(page, null);
    await page.addInitScript(() => localStorage.removeItem("tpd-auth"));
    await page.goto("/hq/sign-in");
    const authorize = page.waitForRequest((r) => r.url().includes("/auth/v1/authorize"));
    await page.getByRole("button", { name: "Sign in with Discord" }).click();
    const url = new URL((await authorize).url());
    expect(url.searchParams.get("provider")).toBe("discord");
    expect(url.searchParams.get("code_challenge_method")).toBe("s256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("redirect_to")).toMatch(/\/hq\/auth\/callback\/$/);
  });

  test("verified member sees their roster record, fleet and access", async ({ page }) => {
    await as(page, { state: "verified", last_sync_at: "2026-11-04T01:00:00Z", member });
    await page.goto("/hq");
    await expect(page.getByText("A. Example")).toBeVisible();
    await expect(page.getByText("Waterfront Unit (W-12, Officer)")).toBeVisible();
    await expect(page.getByText("2015 Charger", { exact: true })).toBeVisible();
  });

  test("unrecognized user gets an explanation and no access", async ({ page }) => {
    await as(page, { state: "unrecognized", last_sync_at: "2026-11-04T01:00:00Z" });
    await page.goto("/hq/sign-in");
    await expect(page.getByText("Not on the roster")).toBeVisible();
    await page.goto("/hq/command/integrations");
    await expect(page.getByText("Command access required")).toBeVisible();
  });

  test("a forged 'verified' response with an invalid rank is not trusted", async ({ page }) => {
    await as(page, { state: "verified", member: { ...member, rank: "Supreme Commander" } });
    await page.goto("/hq/sign-in");
    await expect(page.getByText("Verification unavailable")).toBeVisible();
  });

  test("a roster outage grants nothing", async ({ page }) => {
    await as(page, { message: "boom" }, 503);
    await page.goto("/hq/sign-in");
    await expect(page.getByText("Verification unavailable")).toBeVisible();
    await page.goto("/hq/command/integrations");
    await expect(page.getByText("Command access required")).toBeVisible();
  });

  test("an officer cannot open integrations; a Captain can", async ({ page }) => {
    await as(page, { state: "verified", member });
    await page.goto("/hq/command/integrations");
    await expect(page.getByText("Command access required")).toBeVisible();
    await page.unrouteAll();
    await as(page, { state: "verified", member: { ...member, rank: "Captain", callsign: "X-309" } });
    await page.goto("/hq/command/integrations");
    await expect(page.getByRole("button", { name: "Run health checks" })).toBeVisible();
    await expect(page.getByText("Connected", { exact: true })).toHaveCount(0);
  });
});
