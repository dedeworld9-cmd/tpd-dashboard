/**
 * Google Sheets read access with a service account (read-only scope).
 * The service-account JSON is read from a server-side secret and never leaves the Edge Function.
 */

import { fetchWithRetry, UpstreamError, type RetryOptions } from "./http.ts";

export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (typeof sa.client_email === "string" && typeof sa.private_key === "string" && sa.private_key.includes("PRIVATE KEY")) return sa;
  } catch {
    /* fall through */
  }
  return null;
}

const b64url = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlJson = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Signed JWT assertion for the OAuth 2.0 JWT bearer grant (RS256). */
export async function signAssertion(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000), scope = SHEETS_SCOPE): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const claims = { iss: sa.client_email, scope, aud: sa.token_uri ?? TOKEN_URL, iat: nowSec, exp: nowSec + 3600 };
  const input = `${b64urlJson(header)}.${b64urlJson(claims)}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}

export async function accessToken(sa: ServiceAccount, opts: RetryOptions = {}): Promise<string> {
  const assertion = await signAssertion(sa);
  const res = await fetchWithRetry(
    sa.token_uri ?? TOKEN_URL,
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) },
    opts,
  );
  if (!res.ok) throw new UpstreamError(`Google token request was refused (${res.status}). Check the service-account key.`, res.status, false);
  const body = await res.json();
  if (typeof body.access_token !== "string") throw new UpstreamError("Google token response had no access token", res.status, false);
  return body.access_token;
}

export type Values = (string | number | boolean | null)[][];

/**
 * Reads whole columns of the named tabs (no fixed row ranges, so inserted rows are picked up).
 * FORMATTED_VALUE returns cells as displayed text, which keeps Discord IDs as strings.
 */
export async function readTabs(spreadsheetId: string, ranges: string[], token: string, opts: RetryOptions = {}): Promise<Record<string, Values>> {
  const qs = new URLSearchParams({ majorDimension: "ROWS", valueRenderOption: "FORMATTED_VALUE" });
  for (const r of ranges) qs.append("ranges", r);
  const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${qs}`, { headers: { authorization: `Bearer ${token}` } }, opts);
  if (res.status === 403) throw new UpstreamError("The service account cannot read the roster. Share the sheet with its email as Viewer.", 403, false);
  if (res.status === 404) throw new UpstreamError("Spreadsheet or tab not found. Check GOOGLE_SHEETS_ID and the tab names.", 404, false);
  if (!res.ok) throw new UpstreamError(`Google Sheets answered ${res.status}`, res.status, false);
  const body = await res.json();
  const out: Record<string, Values> = {};
  const got = Array.isArray(body.valueRanges) ? body.valueRanges : [];
  if (got.length !== ranges.length) throw new UpstreamError("Google Sheets returned an incomplete response", res.status, true);
  ranges.forEach((r, i) => (out[r] = Array.isArray(got[i]?.values) ? got[i].values : []));
  return out;
}

export async function spreadsheetTitle(spreadsheetId: string, token: string, opts: RetryOptions = {}): Promise<string> {
  const res = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title`,
    { headers: { authorization: `Bearer ${token}` } },
    opts,
  );
  if (!res.ok) throw new UpstreamError(`Google Sheets answered ${res.status}`, res.status, false);
  return (await res.json())?.properties?.title ?? "";
}

export const ROSTER_RANGES = ["'TPD Roster'!A:Q", "'TPD | Divisions'!A:P"] as const;
