/**
 * Minimal Supabase access for Edge Functions over the documented REST endpoints
 * (Auth /auth/v1, PostgREST /rest/v1). No third-party imports.
 *
 * Two modes:
 *   asUser(jwt)  – runs with the caller's own token, so RLS and is_command() apply.
 *   service()    – service role; used only after the caller's permission was checked.
 */

import { fetchWithRetry } from "./http.ts";

export interface Env {
  get(name: string): string | undefined;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function client(env: Env) {
  const url = env.get("SUPABASE_URL");
  const anon = env.get("SUPABASE_ANON_KEY");
  const serviceKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) throw new HttpError(503, "Backend is not configured");

  const rest =
    (key: string, bearer: string) =>
    async (path: string, init: RequestInit = {}) => {
      const res = await fetchWithRetry(
        `${url}/rest/v1/${path}`,
        { ...init, headers: { apikey: key, authorization: `Bearer ${bearer}`, "content-type": "application/json", ...(init.headers ?? {}) } },
        { attempts: 2 },
      );
      if (!res.ok) throw new HttpError(res.status === 401 || res.status === 403 ? 403 : 502, `database request failed (${res.status})`);
      const t = await res.text();
      return t ? JSON.parse(t) : null;
    };

  return {
    /** Validates the caller's access token with Supabase Auth and returns the user id. */
    async user(jwt: string | null): Promise<{ id: string }> {
      if (!jwt) throw new HttpError(401, "Sign in required");
      const res = await fetchWithRetry(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${jwt}` } }, { attempts: 2 });
      if (!res.ok) throw new HttpError(401, "Session is invalid or expired");
      const u = await res.json();
      return { id: String(u.id) };
    },
    asUser: (jwt: string) => rest(anon, jwt),
    service: () => rest(serviceKey, serviceKey),
    authSettings: async () => {
      const res = await fetchWithRetry(`${url}/auth/v1/settings`, { headers: { apikey: anon } }, { attempts: 2 });
      return res.ok ? res.json() : null;
    },
  };
}

export const bearer = (req: Request) => req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;

export function cors(env: Env, req: Request): Record<string, string> {
  const allowed = (env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": allowed.includes(origin) ? origin : (allowed[0] ?? "null"),
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

export function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json", "cache-control": "no-store" } });
}

/** Wraps a handler with CORS, method checks and error mapping that never echoes secrets. */
export function handler(env: Env, fn: (req: Request) => Promise<{ status?: number; body: unknown }>) {
  return async (req: Request) => {
    const h = cors(env, req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, h);
    try {
      const r = await fn(req);
      return json(r.body, r.status ?? 200, h);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof HttpError ? e.message : "Internal error";
      if (!(e instanceof HttpError)) console.error("unhandled", (e as Error).name, (e as Error).message);
      return json({ error: message }, status, h);
    }
  };
}

/** Throws unless the caller is signed in and holds command access per the roster. */
export async function requireCommand(db: ReturnType<typeof client>, req: Request): Promise<string> {
  const jwt = bearer(req);
  await db.user(jwt);
  const ok = await db.asUser(jwt!)("rpc/is_command", { method: "POST", body: "{}" });
  if (ok !== true) throw new HttpError(403, "Command access is required");
  return jwt!;
}

export async function recordStatus(db: ReturnType<typeof client>, integration: string, status: string, detail: Record<string, unknown>, error?: string) {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = { integration, status, detail, checked_at: now };
  if (status === "connected") row.last_success_at = now;
  if (error) Object.assign(row, { last_error: error, last_error_at: now });
  await db.service()("integration_status?on_conflict=integration", { method: "POST", headers: { prefer: "resolution=merge-duplicates" }, body: JSON.stringify(row) });
}

export async function audit(db: ReturnType<typeof client>, actor: string, action: string, target: string | null, detail: Record<string, unknown>) {
  await db.service()("audit_log", { method: "POST", body: JSON.stringify({ actor, action, target, detail }) });
}

export async function sha256(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}
