/**
 * AnchorCAD Open Developer API (https://docs.anchr.gg/api-reference).
 *
 * Documented facts used here: base https://anchorcad.xyz/api/v1, key in the
 * x-api-key header, keys look like ank_v1.<serverId>.<secret> and are bound to
 * one panel, GET /server returns panel info plus the key's scopes, success
 * responses carry X-Anchor-Open-API: v1, about 120 requests/min per IP.
 * Response fields are not documented, so nothing beyond reachability, key
 * validity and (if present) the scopes list is interpreted. No records are read.
 */

import { fetchWithRetry, type RetryOptions } from "./http.ts";

export const ANCHORCAD_API = "https://anchorcad.xyz/api/v1";
const KEY = /^ank_v1\.[A-Za-z0-9-]+\.[A-Za-z0-9_-]+$/;
const OFFICIAL_HOSTS = ["anchorcad.xyz", "anchr.gg"];

export type Status = "connected" | "not_configured" | "verification_required" | "degraded" | "failed" | "unsupported";

/** Panel launch URL: must be https on an official AnchorCAD host. */
export function checkPanelUrl(raw: string | undefined | null): { status: Status; url: string | null; note: string } {
  if (!raw) return { status: "not_configured", url: null, note: "No AnchorCAD panel URL is configured." };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { status: "failed", url: null, note: "The configured AnchorCAD URL is not a valid URL." };
  }
  if (u.protocol !== "https:") return { status: "failed", url: null, note: "The AnchorCAD URL must use https." };
  const official = OFFICIAL_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  if (!official) return { status: "verification_required", url: u.toString(), note: `${u.hostname} is not an AnchorCAD domain; confirm it before members use it.` };
  return { status: "connected", url: u.toString(), note: "Launch link uses an official AnchorCAD domain." };
}

export interface ApiCheck {
  status: Status;
  note: string;
  scopes: string[] | null;
}

export async function checkApi(key: string | undefined, opts: RetryOptions = {}): Promise<ApiCheck> {
  if (!key) return { status: "not_configured", note: "No AnchorCAD API key. Launch-only mode.", scopes: null };
  if (!KEY.test(key)) return { status: "failed", note: "The AnchorCAD API key is not in the documented ank_v1.<serverId>.<secret> format.", scopes: null };
  let res: Response;
  try {
    res = await fetchWithRetry(`${ANCHORCAD_API}/server`, { headers: { "x-api-key": key, accept: "application/json" } }, { attempts: 2, ...opts });
  } catch {
    return { status: "failed", note: "AnchorCAD could not be reached.", scopes: null };
  }
  if (res.status === 401) return { status: "failed", note: "AnchorCAD rejected the API key (401).", scopes: null };
  if (res.status === 403) return { status: "degraded", note: "The key lacks the scope for GET /server (403).", scopes: null };
  if (res.status === 429) return { status: "degraded", note: "AnchorCAD rate limit reached (429).", scopes: null };
  if (!res.ok) return { status: "failed", note: `AnchorCAD answered ${res.status}.`, scopes: null };
  if (res.headers.get("x-anchor-open-api") !== "v1")
    return { status: "verification_required", note: "Response did not identify as the AnchorCAD Open API (missing X-Anchor-Open-API header).", scopes: null };
  let scopes: string[] | null = null;
  try {
    const body = await res.json();
    const s = body?.scopes ?? body?.key?.scopes;
    if (Array.isArray(s) && s.every((x: unknown) => typeof x === "string")) scopes = s;
  } catch {
    /* body shape is undocumented */
  }
  return { status: "connected", note: "Authenticated GET /server succeeded.", scopes };
}

/** What this site does with AnchorCAD, stated plainly for the integrations panel. */
export const CAPABILITIES = [
  { name: "Launch the department panel", supported: true, note: "From the dashboard, Patrol and Resources." },
  { name: "Verify the API key and panel", supported: true, note: "GET /server, server-side only." },
  { name: "Match members to CAD accounts", supported: false, note: "GET /members exists, but its fields are undocumented; not used until verified." },
  { name: "Report status or references", supported: false, note: "Records endpoints exist; importing CAD records needs explicit approval and is not implemented." },
  { name: "Sync patrol time with CAD duty status", supported: false, note: "Website patrols and CAD units stay separate systems." },
] as const;
