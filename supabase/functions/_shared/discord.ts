/**
 * Read-only Discord bot checks (official REST API v10, bot token from a server secret).
 *
 * Roles never grant website access. The roster decides identity and rank;
 * roles are only compared against it and mismatches are reported for review.
 * Role writes are disabled: planRoleSync() produces a dry-run plan only.
 */

import { fetchWithRetry, UpstreamError, type RetryOptions } from "./http.ts";

const API = "https://discord.com/api/v10";
export const ROLE_WRITES_ENABLED = false as const;
export const SNOWFLAKE = /^\d{17,20}$/;

const headers = (token: string) => ({ authorization: `Bot ${token}`, "user-agent": "TPD-HQ (https://github.com/dedeworld9-cmd/tpd-dashboard, 1.0)" });

async function get(path: string, token: string, opts: RetryOptions) {
  const res = await fetchWithRetry(`${API}${path}`, { headers: headers(token) }, opts);
  return res;
}

export async function botIdentity(token: string, opts: RetryOptions = {}): Promise<{ id: string; username: string }> {
  const res = await get("/users/@me", token, opts);
  if (res.status === 401) throw new UpstreamError("Discord rejected the bot token", 401, false);
  if (!res.ok) throw new UpstreamError(`Discord answered ${res.status}`, res.status, false);
  const b = await res.json();
  return { id: String(b.id), username: String(b.username) };
}

export async function guildInfo(guildId: string, token: string, opts: RetryOptions = {}): Promise<{ id: string; name: string }> {
  if (!SNOWFLAKE.test(guildId)) throw new UpstreamError("DISCORD_GUILD_ID is not a valid ID", null, false);
  const res = await get(`/guilds/${guildId}`, token, opts);
  if (res.status === 403 || res.status === 404) throw new UpstreamError("The bot is not in the configured guild, or the guild ID is wrong", res.status, false);
  if (!res.ok) throw new UpstreamError(`Discord answered ${res.status}`, res.status, false);
  const b = await res.json();
  return { id: String(b.id), name: String(b.name) };
}

export async function guildRoles(guildId: string, token: string, opts: RetryOptions = {}): Promise<{ id: string; name: string; position: number; managed: boolean }[]> {
  const res = await get(`/guilds/${guildId}/roles`, token, opts);
  if (!res.ok) throw new UpstreamError(`Discord answered ${res.status} for guild roles`, res.status, false);
  return (await res.json()).map((r: { id: string; name: string; position: number; managed: boolean }) => ({ id: String(r.id), name: r.name, position: r.position, managed: !!r.managed }));
}

/** A member's role IDs, or null when the user is not in the guild. */
export async function memberRoles(guildId: string, userId: string, token: string, opts: RetryOptions = {}): Promise<string[] | null> {
  if (!SNOWFLAKE.test(userId)) throw new UpstreamError("invalid user ID", null, false);
  const res = await get(`/guilds/${guildId}/members/${userId}`, token, opts);
  if (res.status === 404) return null;
  if (!res.ok) throw new UpstreamError(`Discord answered ${res.status} for a member lookup`, res.status, res.status === 429 || res.status >= 500);
  const b = await res.json();
  return Array.isArray(b.roles) ? b.roles.map(String) : [];
}

export interface RoleMapping {
  role_id: string;
  role_name: string;
  maps_to_kind: "member" | "rank" | "division" | "ignore";
  maps_to_value: string | null;
  confirmed_at: string | null;
}

export interface RosterFacts {
  rank: string;
  divisions: string[];
}

export interface Finding {
  code: "not_in_guild" | "missing_member_role" | "missing_rank_role" | "extra_rank_role" | "missing_division_role" | "extra_division_role";
  detail: string;
}

/**
 * Compares a member's Discord roles with their roster record. Only confirmed
 * mappings are used. The result is informational: it never changes access.
 */
export function evaluateRoles(facts: RosterFacts, roleIds: string[] | null, map: RoleMapping[]): Finding[] {
  if (roleIds === null) return [{ code: "not_in_guild", detail: "Not a member of the TPD Discord server." }];
  const confirmed = map.filter((m) => m.confirmed_at && m.maps_to_kind !== "ignore");
  const has = new Set(roleIds);
  const out: Finding[] = [];
  const memberRoles = confirmed.filter((m) => m.maps_to_kind === "member");
  if (memberRoles.length && !memberRoles.some((m) => has.has(m.role_id))) out.push({ code: "missing_member_role", detail: `Missing the ${memberRoles[0].role_name} role.` });
  for (const m of confirmed.filter((x) => x.maps_to_kind === "rank")) {
    if (m.maps_to_value === facts.rank && !has.has(m.role_id)) out.push({ code: "missing_rank_role", detail: `Roster rank ${facts.rank}, but no ${m.role_name} role.` });
    if (m.maps_to_value !== facts.rank && has.has(m.role_id)) out.push({ code: "extra_rank_role", detail: `Has ${m.role_name}, but the roster rank is ${facts.rank}.` });
  }
  for (const m of confirmed.filter((x) => x.maps_to_kind === "division")) {
    const inDivision = !!m.maps_to_value && facts.divisions.includes(m.maps_to_value);
    if (inDivision && !has.has(m.role_id)) out.push({ code: "missing_division_role", detail: `Roster lists ${m.maps_to_value}, but no ${m.role_name} role.` });
    if (!inDivision && has.has(m.role_id)) out.push({ code: "extra_division_role", detail: `Has ${m.role_name}, but the roster does not list ${m.maps_to_value}.` });
  }
  return out;
}

/**
 * Dry run of what a role sync WOULD do. Only additions are ever planned
 * automatically; removals are listed for manual review, because a failed or
 * stale roster read must never strip someone's roles.
 */
export function planRoleSync(findings: Finding[], map: RoleMapping[], facts: RosterFacts): { add: string[]; reviewRemovals: string[]; writesEnabled: boolean } {
  const confirmed = map.filter((m) => m.confirmed_at);
  const add: string[] = [];
  const reviewRemovals: string[] = [];
  for (const f of findings) {
    if (f.code === "missing_rank_role") add.push(...confirmed.filter((m) => m.maps_to_kind === "rank" && m.maps_to_value === facts.rank).map((m) => m.role_id));
    if (f.code === "missing_division_role") add.push(...confirmed.filter((m) => m.maps_to_kind === "division" && m.maps_to_value && facts.divisions.includes(m.maps_to_value)).map((m) => m.role_id));
    if (f.code === "extra_rank_role" || f.code === "extra_division_role") reviewRemovals.push(f.detail);
  }
  return { add: [...new Set(add)], reviewRemovals, writesEnabled: ROLE_WRITES_ENABLED };
}
