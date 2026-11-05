/**
 * HTTP-level checks of the three Edge Functions with the gateway's JWT check switched off (verify_jwt = false).
 * Real Request objects go through the real handlers; only the network is faked. Every rejected request must
 * (a) get the right status and (b) cause no service-role call, i.e. no data read or written.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discordVerifyHandler } from "../../../supabase/functions/_shared/fn-discord-verify.ts";
import { integrationHealthHandler } from "../../../supabase/functions/_shared/fn-integration-health.ts";
import { rosterSyncHandler } from "../../../supabase/functions/_shared/fn-roster-sync.ts";
import { readJsonBody, secretsMatch } from "../../../supabase/functions/_shared/supabase.ts";

const URL_ = "https://proj.supabase.test";
const ANON = "anon-key-for-tests";
const SERVICE = "service-key-for-tests";
const SYNC_SECRET = "sync-secret-for-tests-0123456789";
const GUILD = "123456789012345678";
const DISCORD_ID = "223456789012345678";

const env = (over: Record<string, string | undefined> = {}) => {
  const e: Record<string, string | undefined> = { SUPABASE_URL: URL_, SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, ROSTER_SYNC_SECRET: SYNC_SECRET, DISCORD_GUILD_ID: GUILD, ALLOWED_ORIGINS: "https://site.test", ...over };
  return { get: (k: string) => e[k] };
};

/** Tokens the fake Supabase Auth knows. Anything else, including expired ones, is a 401. */
const TOKENS: Record<string, { id: string; command: boolean; discord: string | null }> = {
  "command-token": { id: "u-cmd", command: true, discord: DISCORD_ID },
  "member-token": { id: "u-member", command: false, discord: DISCORD_ID },
  "no-discord-token": { id: "u-nodiscord", command: false, discord: null },
};

let calls: { url: string; auth: string; key: string; method: string }[] = [];
const serviceCalls = () => calls.filter((c) => c.key === SERVICE);

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const h = new Headers(init?.headers);
      const key = h.get("apikey") ?? "";
      const auth = (h.get("authorization") ?? "").replace(/^Bearer /, "");
      calls.push({ url, auth, key, method: init?.method ?? "GET" });
      const ok = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
      if (url === `${URL_}/auth/v1/user`) {
        const t = TOKENS[auth];
        return t ? ok({ id: t.id }) : ok({ msg: "invalid JWT" }, 401); // "expired-token", garbage, etc.
      }
      if (url === `${URL_}/auth/v1/settings`) return ok({ external: { discord: true } });
      if (url.startsWith(`${URL_}/rest/v1/`)) {
        const path = url.slice(`${URL_}/rest/v1/`.length);
        const t = key === SERVICE ? { id: "service", command: true, discord: null } : TOKENS[auth];
        if (!t) return ok({ message: "JWT invalid" }, 401);
        if (path === "rpc/is_command") return ok(t.command);
        if (path === "rpc/current_discord_id") return ok(t.discord);
        if (path === "rpc/my_membership") return ok({ member: { callsign: "X-101" } });
        if (key === SERVICE) return ok(path.startsWith("roster_sync_runs") && init?.method === "POST" ? [{ id: "run-1" }] : []);
        return ok([]);
      }
      return new Response("unexpected upstream call: " + url, { status: 500 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const req = (method: string, headers: Record<string, string> = {}, body?: string) =>
  new Request("https://fn.test/functions/v1/x", { method, headers: { origin: "https://site.test", ...headers }, body: method === "GET" || method === "HEAD" ? undefined : body });
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

const functions: [string, (e: ReturnType<typeof env>) => (r: Request) => Promise<Response>][] = [
  ["roster-sync", rosterSyncHandler],
  ["discord-verify", discordVerifyHandler],
  ["integration-health", integrationHealthHandler],
];

describe.each(functions)("%s: HTTP methods", (_n, make) => {
  it.each(["GET", "PUT", "PATCH", "DELETE", "HEAD"])("%s answers 405 before doing anything, even with a valid command token", async (method) => {
    const res = await make(env())(req(method, bearer("command-token")));
    expect(res.status).toBe(405);
    expect(calls).toHaveLength(0); // no auth lookup, no database call: the 405 is not hiding a code path
  });

  it("OPTIONS (CORS preflight) is 204 with no body, only allows POST, and touches nothing", async () => {
    const res = await make(env())(req("OPTIONS"));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(res.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(res.headers.get("access-control-allow-origin")).toBe("https://site.test");
    expect(calls).toHaveLength(0);
  });

  it("does not reflect an unknown origin", async () => {
    const res = await make(env())(new Request("https://fn.test/x", { method: "OPTIONS", headers: { origin: "https://evil.test" } }));
    expect(res.headers.get("access-control-allow-origin")).toBe("https://site.test");
  });

  it("answers 503 with no secrets when the backend is not configured", async () => {
    const res = await make(env({ SUPABASE_SERVICE_ROLE_KEY: undefined }))(req("POST", bearer("command-token"), "{}"));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toMatch(/key|secret|token/i);
  });
});

describe.each(functions)("%s: POST without valid credentials", (_n, make) => {
  const bad: [string, Record<string, string>][] = [
    ["no Authorization header", {}],
    ["empty Authorization header", { authorization: "" }],
    ["'Bearer' with no token", { authorization: "Bearer " }],
    ["Basic scheme", { authorization: "Basic Y29tbWFuZDpjb21tYW5k" }],
    ["token that is not a JWT", bearer("not-a-jwt")],
    ["structurally valid but unknown JWT", bearer("aaa.bbb.ccc")],
    ["expired token", bearer("expired-token")],
    ["the anon key (a valid project key, not a user session)", bearer(ANON)],
    ["the service key presented as a user token", bearer(SERVICE)],
    ["a wrong sync secret, no session", { "x-sync-secret": "wrong-secret" }],
    ["a sync secret that differs only in the last character", { "x-sync-secret": SYNC_SECRET.slice(0, -1) + "X" }],
    ["an empty sync secret header", { "x-sync-secret": "" }],
    ["a sync secret in the wrong header", { authorization: `Bearer ${SYNC_SECRET}` }],
  ];
  it.each(bad)("%s → 401, no data touched", async (_label, headers) => {
    const res = await make(env())(req("POST", headers, JSON.stringify({ mode: "apply", discordToken: "x" })));
    expect(res.status).toBe(401);
    expect(serviceCalls()).toHaveLength(0);
    expect(calls.filter((c) => c.url.includes("/rest/v1/"))).toHaveLength(0);
  });
});

describe("roster-sync: authorization", () => {
  it("a signed-in member who is not command is refused (403) and nothing is read or written", async () => {
    const res = await rosterSyncHandler(env())(req("POST", bearer("member-token"), JSON.stringify({ mode: "apply", confirmRemovals: true })));
    expect(res.status).toBe(403);
    expect(serviceCalls()).toHaveLength(0);
  });
  it("a signed-in user with no Discord identity is refused (403)", async () => {
    const res = await rosterSyncHandler(env())(req("POST", bearer("no-discord-token"), "{}"));
    expect(res.status).toBe(403);
    expect(serviceCalls()).toHaveLength(0);
  });
  it("the sync secret is ignored when ROSTER_SYNC_SECRET is not configured (an empty secret is not a password)", async () => {
    for (const sent of ["", "undefined", "null"]) {
      const res = await rosterSyncHandler(env({ ROSTER_SYNC_SECRET: undefined }))(req("POST", { "x-sync-secret": sent }, "{}"));
      expect(res.status).toBe(401);
    }
    expect(serviceCalls()).toHaveLength(0);
  });
  it("a command user passes authorization (stops at the unconfigured Google step, 503, not 401/403)", async () => {
    const res = await rosterSyncHandler(env())(req("POST", bearer("command-token"), JSON.stringify({ mode: "preview" })));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Google Sheets is not configured") });
  });
  it("the right sync secret authenticates the scheduler (no session needed) and reaches the same step", async () => {
    const res = await rosterSyncHandler(env())(req("POST", { "x-sync-secret": SYNC_SECRET }, JSON.stringify({ mode: "preview" })));
    expect(res.status).toBe(503);
    expect(calls.some((c) => c.url.endsWith("/auth/v1/user"))).toBe(false);
  });
  it("authenticates before reading the body: an unauthenticated caller cannot probe parsing errors", async () => {
    for (const body of ["{not json", "[]", "x".repeat(40_000)]) {
      const res = await rosterSyncHandler(env())(req("POST", {}, body));
      expect(res.status).toBe(401);
    }
  });
  it("authenticated callers get 400 for malformed JSON or a non-object, and 413 for oversized bodies", async () => {
    const run = (body: string, h: Record<string, string> = bearer("command-token")) => rosterSyncHandler(env())(req("POST", h, body));
    expect((await run("{not json")).status).toBe(400);
    expect((await run("[]")).status).toBe(400);
    expect((await run('"apply"')).status).toBe(400);
    expect((await run("x".repeat(40_000))).status).toBe(413);
    expect((await run("{not json", { "x-sync-secret": SYNC_SECRET })).status).toBe(400); // the scheduler too: a garbled body never defaults to apply
    expect(serviceCalls().filter((c) => c.url.includes("roster_sync_runs"))).toHaveLength(0); // no run row was created
  });
  it("error responses never contain the secret, tokens or keys", async () => {
    const res = await rosterSyncHandler(env())(req("POST", { "x-sync-secret": "wrong", ...bearer("expired-token") }, "{}"));
    const text = await res.text();
    for (const s of [SYNC_SECRET, SERVICE, ANON, "expired-token"]) expect(text).not.toContain(s);
  });
});

describe("integration-health: authorization", () => {
  it("a signed-in member who is not command is refused (403)", async () => {
    const res = await integrationHealthHandler(env())(req("POST", bearer("member-token"), "{}"));
    expect(res.status).toBe(403);
    expect(serviceCalls()).toHaveLength(0);
  });
  it("the scheduler's sync secret does not open integration-health", async () => {
    const res = await integrationHealthHandler(env())(req("POST", { "x-sync-secret": SYNC_SECRET }, "{}"));
    expect(res.status).toBe(401);
    expect(serviceCalls()).toHaveLength(0);
  });
  it("a command user gets statuses but no secret values", async () => {
    const res = await integrationHealthHandler(env({ GOOGLE_SHEETS_ID: "sheet", ANCHORCAD_API_KEY: "anchor-secret-value" }))(req("POST", bearer("command-token"), "{}"));
    expect(res.status).toBe(200);
    const text = await res.text();
    for (const s of [SERVICE, ANON, SYNC_SECRET, "anchor-secret-value"]) expect(text).not.toContain(s);
    expect(JSON.parse(text)).toHaveProperty("discord_oauth");
  });
});

describe("discord-verify: authorization", () => {
  const post = (token: string | null, body: unknown, e = env()) => discordVerifyHandler(e)(req("POST", token ? bearer(token) : {}, typeof body === "string" ? body : JSON.stringify(body)));
  it("checks the session before the server configuration (an unauthenticated caller learns nothing about setup)", async () => {
    const res = await post(null, { discordToken: "t" }, env({ DISCORD_GUILD_ID: undefined }));
    expect(res.status).toBe(401);
    expect(serviceCalls()).toHaveLength(0);
  });
  it("a valid session without a Discord identity is refused (403) and Discord is never called", async () => {
    const res = await post("no-discord-token", { discordToken: "t" });
    expect(res.status).toBe(403);
    expect(calls.some((c) => c.url.includes("discord.com"))).toBe(false);
    expect(serviceCalls()).toHaveLength(0);
  });
  it("a valid session with no Discord token in the body is 400", async () => {
    expect((await post("member-token", {})).status).toBe(400);
    expect((await post("member-token", { discordToken: 12345 })).status).toBe(400);
    expect((await post("member-token", { discordToken: "x".repeat(600) })).status).toBe(400);
    expect((await post("member-token", { discordToken: ["a"] })).status).toBe(400);
  });
  it("malformed, array and oversized bodies from a signed-in user: 400 / 413", async () => {
    expect((await post("member-token", "{oops")).status).toBe(400);
    expect((await post("member-token", "[]")).status).toBe(400);
    expect((await post("member-token", "x".repeat(40_000))).status).toBe(413);
  });
  it("a Discord token that belongs to another account is refused (403)", async () => {
    const real = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const inner = real.getMockImplementation()!;
    real.mockImplementation(async (input: string | URL, init?: RequestInit) =>
      String(input).startsWith("https://discord.com/api") ? new Response(JSON.stringify({ id: "999999999999999999" }), { status: 200 }) : inner(input, init));
    const res = await post("member-token", { discordToken: "someone-elses-token" });
    expect(res.status).toBe(403);
    expect(serviceCalls().filter((c) => c.method !== "GET" || c.url.includes("discord_verifications"))).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("secretsMatch is exact, case sensitive and false for empty or missing values", async () => {
    expect(await secretsMatch("abc", "abc")).toBe(true);
    expect(await secretsMatch("abc", "abd")).toBe(false);
    expect(await secretsMatch("ABC", "abc")).toBe(false);
    expect(await secretsMatch("abc", "abcd")).toBe(false);
    for (const [a, b] of [["", ""], [null, "x"], ["x", undefined], [null, null], ["", "x"]] as const) expect(await secretsMatch(a, b)).toBe(false);
  });
  it("readJsonBody treats an empty body as {} and counts bytes, not characters", async () => {
    expect(await readJsonBody(new Request("https://x.test", { method: "POST", body: "" }))).toEqual({});
    await expect(readJsonBody(new Request("https://x.test", { method: "POST", body: JSON.stringify({ a: "é".repeat(9000) }) }))).rejects.toMatchObject({ status: 413 });
  });
});
