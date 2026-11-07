/**
 * Parses, validates and diffs the official TPD roster workbook.
 *
 * Pure functions with no imports from the app or Deno, so the same file runs in
 * the roster-sync Edge Function and in the Vitest suite.
 *
 * The workbook is a formatted sheet, not a table: title rows, star-rated section
 * headings, blank spacer rows and vacant slots. The parser therefore
 *   - finds the header row by its labels (CALL SIGN, NAME, DISCORD USER ID, POSITION),
 *   - maps columns by header text, never by fixed position,
 *   - reads section headings for the tier, and
 *   - never depends on row numbers, so inserted rows do not break it.
 * The POINTS column (disciplinary standing) is deliberately never read.
 */

export const RANKS = [
  "Chief of Police",
  "Deputy Chief",
  "Assistant Chief",
  "Major",
  "Captain",
  "Lieutenant",
  "Sergeant",
  "Corporal",
  "Senior Officer",
  "Officer",
  "Reserve Officer",
  "Probationary Officer",
] as const;
export type Rank = (typeof RANKS)[number];

export const TIERS = ["Office of the Chiefs", "Command Staff", "Division Command", "Field Supervisory", "Patrol Bureau"] as const;
export type Tier = (typeof TIERS)[number];
export type District = "North" | "South";

/** Division call-sign prefixes on the TPD | Divisions tab. */
export const DIVISION_PREFIXES: Record<string, string> = {
  W: "waterfront",
  T: "traffic-interdiction",
  PA: "public-affairs",
  IA: "internal-affairs",
  D: "strategic-operations",
  A: "swat",
};

export type Cell = string | number | boolean | null | undefined;
export type Rows = Cell[][];

export interface ParsedPosition {
  ord: number;
  /** A1 row number in the sheet, for messages only. */
  row: number;
  callsign: string | null;
  rank: Rank;
  appointment: string;
  tier: Tier;
  district: District | null;
  name: string | null;
  discordId: string | null;
  timezone: string | null;
}

export interface ParsedDivisionSlot {
  row: number;
  callsign: string;
  division: string;
  role: string;
  title: string;
  name: string | null;
  discordId: string | null;
}

export interface Issue {
  severity: "error" | "warning";
  code: string;
  message: string;
  sheet: "TPD Roster" | "TPD | Divisions";
  row?: number;
}

const text = (c: Cell) => (c === null || c === undefined ? "" : String(c)).trim();
const norm = (c: Cell) => text(c).toUpperCase().replace(/\s+/g, " ");
const SNOWFLAKE = /^\d{17,20}$/;
const CALLSIGN = /^X-\d{3}$/;

/** Returns the index of the header row and a map of normalized label → column. */
export function findHeader(rows: Rows, required: string[]): { index: number; cols: Record<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    const labels = (rows[i] ?? []).map(norm);
    if (required.every((r) => labels.includes(r))) {
      const cols: Record<string, number> = {};
      labels.forEach((l, j) => {
        if (l && cols[l] === undefined) cols[l] = j;
      });
      return { index: i, cols };
    }
  }
  return null;
}

function tierFromHeading(s: string): Tier | "North" | "South" | null {
  const t = s.toLowerCase();
  if (t.includes("office of the chiefs")) return "Office of the Chiefs";
  if (t.includes("command staff")) return "Command Staff";
  if (t.includes("division command")) return "Division Command";
  if (t.includes("field supervisory")) return "Field Supervisory";
  if (t.includes("patrol bureau")) return "Patrol Bureau";
  if (t.includes("south district")) return "South";
  if (t.includes("north district")) return "North";
  return null;
}

const asRank = (s: string): Rank | null => ((RANKS as readonly string[]).find((r) => r.toLowerCase() === s.toLowerCase()) as Rank | undefined) ?? null;

function districtOf(appointment: string, callsign: string | null, section: District | null): District | null {
  if (/north district/i.test(appointment)) return "North";
  if (/south district/i.test(appointment)) return "South";
  if (section) return section;
  // PC-11 interim default: X-4xx North, X-5xx South.
  if (callsign && /^X-4\d\d$/.test(callsign)) return "North";
  if (callsign && /^X-5\d\d$/.test(callsign)) return "South";
  return null;
}

/** Ranks below Field Supervisory belong to the Patrol Bureau, as on Numbers by Rank. */
function tierFor(rank: Rank, section: Tier | null, callsign: string | null): Tier {
  if (callsign && /^X-[45]\d\d$/.test(callsign)) return rank === "Sergeant" ? "Field Supervisory" : "Patrol Bureau";
  return section ?? "Patrol Bureau";
}

export function parseRoster(rows: Rows): { positions: ParsedPosition[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const header = findHeader(rows, ["CALL SIGN", "NAME", "DISCORD USER ID", "POSITION"]);
  if (!header) {
    issues.push({ severity: "error", code: "header_missing", sheet: "TPD Roster", message: "Header row (CALL SIGN, NAME, DISCORD USER ID, POSITION) not found." });
    return { positions: [], issues };
  }
  const c = header.cols;
  const col = (row: Cell[], label: string) => (c[label] === undefined ? "" : text(row[c[label]]));
  const positions: ParsedPosition[] = [];
  let section: Tier | null = null;
  let district: District | null = null;

  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const filled = row.map(text).filter(Boolean);
    if (!filled.length) continue;
    const position = col(row, "POSITION");
    if (!position) {
      const heading = tierFromHeading(filled.join(" "));
      if (heading === "North" || heading === "South") {
        district = heading;
        section = "Patrol Bureau";
      } else if (heading) {
        section = heading;
        district = null;
      }
      continue;
    }
    const rank = asRank(position);
    const rawCallsign = col(row, "CALL SIGN");
    const name = col(row, "NAME") || null;
    const discordId = col(row, "DISCORD USER ID") || null;
    const tz = col(row, "TIMEZONE");
    // A placeholder such as "—" or "TBD" on a vacant slot is simply no call sign. On a filled slot a malformed call sign is an error:
    // matching and call-sign uniqueness depend on it.
    const validCallsign = CALLSIGN.test(rawCallsign);
    const callsign = validCallsign ? rawCallsign : null;
    if (rawCallsign && !validCallsign && (name || discordId))
      issues.push({ severity: "error", code: "invalid_callsign", sheet: "TPD Roster", row: i + 1, message: `Row ${i + 1}: call sign "${rawCallsign}" is not in the X-### format.` });
    if (!rank) {
      issues.push({ severity: "error", code: "invalid_rank", sheet: "TPD Roster", row: i + 1, message: `Unknown rank "${position}"${callsign ? ` at ${callsign}` : ""}.` });
      continue;
    }
    const appointment = col(row, "APPOINTMENT");
    positions.push({
      ord: positions.length + 1,
      row: i + 1,
      callsign,
      rank,
      appointment,
      tier: tierFor(rank, section, callsign),
      district: districtOf(appointment, callsign, district),
      name,
      discordId,
      timezone: tz && tz.toUpperCase() !== "N/A" ? tz : null,
    });
  }
  if (!positions.length) issues.push({ severity: "error", code: "no_positions", sheet: "TPD Roster", message: "No positions were read; the response may be incomplete." });
  return { positions, issues };
}

export function parseDivisions(rows: Rows): { slots: ParsedDivisionSlot[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const header = findHeader(rows, ["CALL SIGN", "NAME", "DISCORD USER ID", "POSITION"]);
  if (!header) {
    issues.push({ severity: "error", code: "header_missing", sheet: "TPD | Divisions", message: "Header row not found on the Divisions tab." });
    return { slots: [], issues };
  }
  const c = header.cols;
  const col = (row: Cell[], label: string) => (c[label] === undefined ? "" : text(row[c[label]]));
  const slots: ParsedDivisionSlot[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const callsign = col(row, "CALL SIGN");
    const m = /^([A-Z]{1,2})-\d{2}$/.exec(callsign);
    if (!m) continue; // headings and spacer rows
    const division = DIVISION_PREFIXES[m[1]];
    if (!division) {
      issues.push({ severity: "warning", code: "unknown_division", sheet: "TPD | Divisions", row: i + 1, message: `Unknown division prefix in ${callsign}; slot skipped.` });
      continue;
    }
    slots.push({ row: i + 1, callsign, division, role: col(row, "POSITION"), title: col(row, "APPOINTMENT"), name: col(row, "NAME") || null, discordId: col(row, "DISCORD USER ID") || null });
  }
  return { slots, issues };
}

export interface SnapshotMember {
  discordId: string;
  name: string;
  callsign: string | null;
  rank: Rank;
  appointment: string;
  tier: Tier;
  district: District | null;
  timezone: string | null;
}

export interface Snapshot {
  members: SnapshotMember[];
  positions: Omit<ParsedPosition, "row" | "name" | "timezone">[];
  divisionSlots: { callsign: string; division: string; role: string; title: string; discordId: string | null }[];
}

/**
 * Validates parsed rows and builds the snapshot to apply. Any error makes the
 * snapshot unsafe: the caller must not apply it, and the last valid snapshot stays.
 */
export function buildSnapshot(roster: ReturnType<typeof parseRoster>, divisions: ReturnType<typeof parseDivisions>): { snapshot: Snapshot; issues: Issue[]; ok: boolean } {
  const issues = [...roster.issues, ...divisions.issues];
  const byId = new Map<string, ParsedPosition>();
  const signs = new Map<string, number>();

  for (const p of roster.positions) {
    if (p.callsign) {
      if (signs.has(p.callsign))
        issues.push({ severity: "error", code: "duplicate_callsign", sheet: "TPD Roster", row: p.row, message: `Call sign ${p.callsign} appears on rows ${signs.get(p.callsign)} and ${p.row}.` });
      else signs.set(p.callsign, p.row);
    }
    if (p.discordId && !SNOWFLAKE.test(p.discordId)) {
      issues.push({
        severity: "error",
        code: "malformed_discord_id",
        sheet: "TPD Roster",
        row: p.row,
        message: `Row ${p.row}${p.callsign ? ` (${p.callsign})` : ""}: Discord user ID is not a valid ID.`,
      });
      continue;
    }
    if (p.name && !p.discordId)
      issues.push({
        severity: "warning",
        code: "missing_discord_id",
        sheet: "TPD Roster",
        row: p.row,
        message: `${p.callsign ?? `Row ${p.row}`}: ${p.name} has no Discord user ID, so they cannot sign in until it is added.`,
      });
    if (p.discordId && !p.name)
      issues.push({ severity: "warning", code: "missing_name", sheet: "TPD Roster", row: p.row, message: `${p.callsign ?? `Row ${p.row}`}: a Discord user ID is listed without a name.` });
    if (p.discordId) {
      const prev = byId.get(p.discordId);
      if (prev)
        issues.push({
          severity: "error",
          code: "duplicate_discord_id",
          sheet: "TPD Roster",
          row: p.row,
          message: `The same Discord user ID holds ${prev.callsign ?? `row ${prev.row}`} and ${p.callsign ?? `row ${p.row}`}.`,
        });
      else byId.set(p.discordId, p);
    }
    if (!p.callsign && p.discordId)
      issues.push({ severity: "warning", code: "missing_callsign", sheet: "TPD Roster", row: p.row, message: `Row ${p.row}: ${p.name ?? "a member"} holds a position without a call sign.` });
  }

  const slotSigns = new Set<string>();
  for (const s of divisions.slots) {
    if (slotSigns.has(s.callsign)) issues.push({ severity: "error", code: "duplicate_callsign", sheet: "TPD | Divisions", row: s.row, message: `Division call sign ${s.callsign} appears twice.` });
    slotSigns.add(s.callsign);
    if (s.discordId && !SNOWFLAKE.test(s.discordId))
      issues.push({ severity: "error", code: "malformed_discord_id", sheet: "TPD | Divisions", row: s.row, message: `${s.callsign}: Discord user ID is not a valid ID.` });
    else if (s.discordId && !byId.has(s.discordId))
      issues.push({
        severity: "warning",
        code: "division_member_not_on_roster",
        sheet: "TPD | Divisions",
        row: s.row,
        message: `${s.callsign}: holder is not on the TPD Roster tab; the slot is shown as vacant.`,
      });
    else if (s.discordId && s.name && byId.get(s.discordId)?.name && byId.get(s.discordId)!.name !== s.name)
      issues.push({
        severity: "warning",
        code: "division_name_mismatch",
        sheet: "TPD | Divisions",
        row: s.row,
        message: `${s.callsign}: name "${s.name}" differs from the roster name "${byId.get(s.discordId)!.name}".`,
      });
  }

  // HB §9.3: at most three concurrent subdivisions. Reported, not blocked: the roster is the source of truth.
  const perMember = new Map<string, number>();
  for (const s of divisions.slots) if (s.discordId && byId.has(s.discordId)) perMember.set(s.discordId, (perMember.get(s.discordId) ?? 0) + 1);
  for (const [id, n] of perMember)
    if (n > 3) issues.push({ severity: "warning", code: "too_many_divisions", sheet: "TPD | Divisions", message: `${byId.get(id)!.callsign ?? "A member"} holds ${n} division slots; Handbook §9.3 allows three.` });

  // Two different Discord IDs under one name usually means a typo in one of them.
  const names = new Map<string, string[]>();
  for (const p of byId.values()) if (p.name) names.set(p.name.toLowerCase(), [...(names.get(p.name.toLowerCase()) ?? []), p.callsign ?? `row ${p.row}`]);
  for (const [n, at] of names) if (at.length > 1) issues.push({ severity: "warning", code: "duplicate_name", sheet: "TPD Roster", message: `The name "${n}" appears with different Discord IDs at ${at.join(", ")}.` });

  // A sheet with positions but nobody signed up is an incomplete read, not a roster.
  if (roster.positions.length && !byId.size)
    issues.push({ severity: "error", code: "no_members", sheet: "TPD Roster", message: "No position has both a name and a valid Discord user ID; the read looks incomplete." });

  const members: SnapshotMember[] = [...byId.values()].map((p) => ({
    discordId: p.discordId!,
    name: p.name ?? p.callsign ?? "Unnamed",
    callsign: p.callsign,
    rank: p.rank,
    appointment: p.appointment,
    tier: p.tier,
    district: p.district,
    timezone: p.timezone,
  }));
  const snapshot: Snapshot = {
    members,
    positions: roster.positions.map((p) => ({
      ord: p.ord,
      callsign: p.callsign,
      rank: p.rank,
      appointment: p.appointment,
      tier: p.tier,
      district: p.district,
      // Only the member's first (validated) position links to them; vacant and invalid rows stay unlinked.
      discordId: p.discordId && byId.get(p.discordId) === p ? p.discordId : null,
    })),
    divisionSlots: divisions.slots.map((s) => ({ callsign: s.callsign, division: s.division, role: s.role, title: s.title, discordId: s.discordId && byId.has(s.discordId) ? s.discordId : null })),
  };
  return { snapshot, issues, ok: !issues.some((i) => i.severity === "error") };
}

export interface CurrentMember {
  discordId: string;
  name: string;
  callsign: string | null;
  rank: string;
  appointment: string;
  district: string | null;
  status: string;
}

export type Change =
  | { kind: "added"; discordId: string; name: string; callsign: string | null; rank: string }
  | { kind: "removed"; discordId: string; name: string; callsign: string | null }
  | { kind: "updated"; discordId: string; name: string; fields: Record<string, { from: unknown; to: unknown }> };

/** Differences between the database (current) and the snapshot. */
export function diffMembers(current: CurrentMember[], next: SnapshotMember[]): Change[] {
  const changes: Change[] = [];
  const now = new Map(current.filter((m) => m.status !== "former").map((m) => [m.discordId, m]));
  const all = new Map(current.map((m) => [m.discordId, m]));
  for (const n of next) {
    const c = all.get(n.discordId);
    if (!c || c.status === "former") {
      changes.push({ kind: "added", discordId: n.discordId, name: n.name, callsign: n.callsign, rank: n.rank });
      continue;
    }
    const fields: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of ["name", "callsign", "rank", "appointment", "district"] as const) if ((c[k] ?? null) !== (n[k] ?? null)) fields[k] = { from: c[k] ?? null, to: n[k] ?? null };
    if (Object.keys(fields).length) changes.push({ kind: "updated", discordId: n.discordId, name: n.name, fields });
  }
  const nextIds = new Set(next.map((n) => n.discordId));
  for (const c of now.values()) if (!nextIds.has(c.discordId)) changes.push({ kind: "removed", discordId: c.discordId, name: c.name, callsign: c.callsign });
  return changes;
}

/**
 * Guard against a partial or broken read that would mark many members former.
 * Above the limit the run is rejected unless a command user explicitly confirms.
 */
export function removalGuard(currentActive: number, changes: Change[], confirmed: boolean): Issue | null {
  const removed = changes.filter((c) => c.kind === "removed").length;
  const limit = Math.max(3, Math.ceil(currentActive * 0.25));
  if (removed > limit && !confirmed)
    return {
      severity: "error",
      code: "mass_removal",
      sheet: "TPD Roster",
      message: `${removed} of ${currentActive} active members would be marked former. This looks like an incomplete read; a command user must confirm it manually.`,
    };
  return null;
}

/**
 * Guard against a truncated sheet read: far fewer authorized positions than the last applied snapshot.
 * Positions only change when leadership edits the structure, so a large drop is almost always a broken read.
 */
export function positionShrinkGuard(previous: number | null, next: number, confirmed: boolean): Issue | null {
  if (!previous || confirmed || next >= previous * 0.8) return null;
  return {
    severity: "error",
    code: "positions_shrunk",
    sheet: "TPD Roster",
    message: `${next} positions were read, down from ${previous} at the last import. This looks like an incomplete read; a command user must confirm it manually.`,
  };
}

/** Stable hash input so unchanged sheets are recognized without re-applying. */
export function canonical(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}
