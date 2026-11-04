import { describe, expect, it } from "vitest";
import { checkApi, checkPanelUrl, CAPABILITIES } from "../../../supabase/functions/_shared/anchorcad.ts";
import { evaluateRoles, ownGuildMember, planRoleSync, ROLE_WRITES_ENABLED, tokenOwner, USER_SCOPES, type RoleMapping } from "../../../supabase/functions/_shared/discord.ts";
import { accessToken, parseServiceAccount, readTabs, signAssertion, SHEETS_SCOPE } from "../../../supabase/functions/_shared/google.ts";
import { fetchWithRetry, UpstreamError } from "../../../supabase/functions/_shared/http.ts";

const noSleep = { sleep: async () => {}, baseDelayMs: 1 };
type Call = { url: string; init?: RequestInit };
function fakeFetch(responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses.shift();
    if (!r) throw new Error("no more responses");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { f, calls };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

describe("http retries", () => {
  it("retries 429 and 5xx, then succeeds", async () => {
    const { f, calls } = fakeFetch([json({}, 429, { "retry-after": "0" }), json({}, 503), json({ ok: true })]);
    const res = await fetchWithRetry("https://example.test/x", {}, { fetchImpl: f, ...noSleep });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(3);
  });
  it("gives up after the attempt limit with a retryable error", async () => {
    const { f } = fakeFetch([json({}, 500), json({}, 500), json({}, 500)]);
    await expect(fetchWithRetry("https://example.test/x", {}, { fetchImpl: f, ...noSleep })).rejects.toMatchObject({ status: 500, retryable: true });
  });
  it("does not retry ordinary client errors", async () => {
    const { f, calls } = fakeFetch([json({}, 403)]);
    expect((await fetchWithRetry("https://example.test/x", {}, { fetchImpl: f, ...noSleep })).status).toBe(403);
    expect(calls).toHaveLength(1);
  });
});

async function testServiceAccount() {
  const pair = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;
  return { sa: { client_email: "roster-reader@example.iam.gserviceaccount.com", private_key: pem }, publicKey: pair.publicKey };
}

describe("Google service account", () => {
  it("rejects missing or malformed credentials", () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount("not json")).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ client_email: "x" }))).toBeNull();
  });

  it("signs a valid RS256 assertion with the read-only Sheets scope", async () => {
    const { sa, publicKey } = await testServiceAccount();
    const jwt = await signAssertion(sa, 1_800_000_000);
    const [h, c, s] = jwt.split(".");
    const dec = (x: string) => JSON.parse(Buffer.from(x, "base64url").toString());
    expect(dec(h)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(dec(c)).toMatchObject({ iss: sa.client_email, scope: SHEETS_SCOPE, aud: "https://oauth2.googleapis.com/token", exp: 1_800_003_600 });
    expect(SHEETS_SCOPE).toMatch(/readonly$/);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, Buffer.from(s, "base64url"), new TextEncoder().encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });

  it("reports a refused token clearly", async () => {
    const { sa } = await testServiceAccount();
    const { f } = fakeFetch([json({ error: "invalid_grant" }, 400)]);
    await expect(accessToken(sa, { fetchImpl: f, ...noSleep })).rejects.toThrow(/refused/);
  });

  it("explains a sheet the service account cannot read, and rejects a partial batch", async () => {
    await expect(readTabs("sheet", ["a", "b"], "t", { fetchImpl: fakeFetch([json({}, 403)]).f, ...noSleep })).rejects.toThrow(/Share the sheet/);
    await expect(readTabs("sheet", ["a", "b"], "t", { fetchImpl: fakeFetch([json({ valueRanges: [{ values: [] }] })]).f, ...noSleep })).rejects.toThrow(/incomplete/);
    const ok = await readTabs("sheet", ["a", "b"], "t", { fetchImpl: fakeFetch([json({ valueRanges: [{ values: [["x"]] }, {}] })]).f, ...noSleep });
    expect(ok).toEqual({ a: [["x"]], b: [] });
  });
});

describe("Discord bot (read-only)", () => {
  const map: RoleMapping[] = [
    { role_id: "800000000000000001", role_name: "TPD Member", maps_to_kind: "member", maps_to_value: null, confirmed_at: "2026-11-04" },
    { role_id: "800000000000000002", role_name: "Officer", maps_to_kind: "rank", maps_to_value: "Officer", confirmed_at: "2026-11-04" },
    { role_id: "800000000000000003", role_name: "Chief of Police", maps_to_kind: "rank", maps_to_value: "Chief of Police", confirmed_at: "2026-11-04" },
    { role_id: "800000000000000004", role_name: "SWAT", maps_to_kind: "division", maps_to_value: "swat", confirmed_at: null },
  ];

  it("role writes are disabled", () => expect(ROLE_WRITES_ENABLED).toBe(false));

  it("reports a Chief role held by a roster Officer as a mismatch, never as access", () => {
    const f = evaluateRoles({ rank: "Officer", divisions: [] }, ["800000000000000001", "800000000000000003"], map);
    expect(f.map((x) => x.code)).toEqual(["missing_rank_role", "extra_rank_role"]);
    const plan = planRoleSync(f, map, { rank: "Officer", divisions: [] });
    expect(plan).toEqual({ add: ["800000000000000002"], reviewRemovals: ["Has Chief of Police, but the roster rank is Officer."], writesEnabled: false });
  });

  it("ignores unconfirmed mappings", () => {
    expect(evaluateRoles({ rank: "Officer", divisions: ["swat"] }, ["800000000000000001", "800000000000000002"], map)).toEqual([]);
  });

  it("distinguishes 'not in the server' from an outage or a missing scope", async () => {
    const g = "700000000000000001";
    expect(await ownGuildMember(g, "t", { fetchImpl: fakeFetch([json({ message: "Unknown Guild", code: 10004 }, 404)]).f, ...noSleep })).toBeNull();
    expect(evaluateRoles({ rank: "Officer", divisions: [] }, null, map)[0].code).toBe("not_in_guild");
    await expect(ownGuildMember(g, "t", { fetchImpl: fakeFetch([json({}, 500), json({}, 500), json({}, 500)]).f, ...noSleep })).rejects.toBeInstanceOf(UpstreamError);
    await expect(ownGuildMember(g, "t", { fetchImpl: fakeFetch([json({}, 403)]).f, ...noSleep })).rejects.toThrow(/guilds.members.read/);
    await expect(ownGuildMember(g, "t", { fetchImpl: fakeFetch([json({}, 401)]).f, ...noSleep })).rejects.toThrow(/Sign in again/);
    await expect(ownGuildMember("not-an-id", "t", { fetchImpl: fakeFetch([]).f, ...noSleep })).rejects.toThrow(/not a valid ID/);
  });

  it("reads the member's own roles with their bearer token on discord.com only", async () => {
    const { f, calls } = fakeFetch([json({ roles: ["800000000000000001"], nick: null })]);
    expect(await ownGuildMember("700000000000000001", "usertok", { fetchImpl: f, ...noSleep })).toEqual({ roles: ["800000000000000001"], nick: null });
    const u = new URL(calls[0].url);
    expect(u.host).toBe("discord.com");
    expect(u.pathname).toBe("/api/v10/users/@me/guilds/700000000000000001/member");
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe("Bearer usertok");
  });

  it("identifies the token owner and rejects a bad token", async () => {
    expect(await tokenOwner("t", { fetchImpl: fakeFetch([json({ id: "100000000000000001", username: "x" })]).f, ...noSleep })).toEqual({ id: "100000000000000001", username: "x" });
    await expect(tokenOwner("bad", { fetchImpl: fakeFetch([json({}, 401)]).f, ...noSleep })).rejects.toThrow(/rejected the sign-in token/);
    await expect(tokenOwner("t", { fetchImpl: fakeFetch([json({ id: "nope" })]).f, ...noSleep })).rejects.toThrow(/invalid user ID/);
  });

  it("requests only read scopes", () => {
    expect(USER_SCOPES.split(" ").sort()).toEqual(["guilds.members.read", "identify"]);
  });
});

describe("AnchorCAD", () => {
  it("validates the panel launch URL", () => {
    expect(checkPanelUrl(undefined).status).toBe("not_configured");
    expect(checkPanelUrl("http://anchorcad.xyz/panel").status).toBe("failed");
    expect(checkPanelUrl("https://evil.example/anchorcad").status).toBe("verification_required");
    expect(checkPanelUrl("https://anchorcad.xyz/dashboard").status).toBe("connected");
  });

  it("is honest about the API", async () => {
    expect((await checkApi(undefined)).status).toBe("not_configured");
    expect((await checkApi("plain-key")).status).toBe("failed");
    const key = "ank_v1.11111111-2222.secretpart";
    expect((await checkApi(key, { fetchImpl: fakeFetch([json({ error: "x" }, 401)]).f, ...noSleep })).status).toBe("failed");
    expect((await checkApi(key, { fetchImpl: fakeFetch([json({ error: "x" }, 403)]).f, ...noSleep })).status).toBe("degraded");
    expect((await checkApi(key, { fetchImpl: fakeFetch([json({ name: "x" })]).f, ...noSleep })).status).toBe("verification_required");
    const ok = await checkApi(key, { fetchImpl: fakeFetch([json({ scopes: ["server:read"] }, 200, { "x-anchor-open-api": "v1" })]).f, ...noSleep });
    expect(ok).toEqual({ status: "connected", note: "Authenticated GET /server succeeded.", scopes: ["server:read"] });
    expect((await checkApi(key, { fetchImpl: fakeFetch([new TypeError("fetch failed"), new TypeError("fetch failed")]).f, ...noSleep })).status).toBe("failed");
  });

  it("lists unsupported capabilities instead of faking them", () => {
    expect(CAPABILITIES.filter((c) => !c.supported).map((c) => c.name)).toContain("Sync patrol time with CAD duty status");
  });
});
