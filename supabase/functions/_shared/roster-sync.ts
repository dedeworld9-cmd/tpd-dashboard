/**
 * Roster sync orchestration (Google Sheets → database), with injected I/O so
 * every path can be tested. Order: read → parse → validate → diff → guard → apply.
 * Anything short of a clean, validated snapshot leaves the database untouched.
 */

import { buildSnapshot, canonical, diffMembers, parseDivisions, parseRoster, positionShrinkGuard, removalGuard, type Change, type CurrentMember, type Issue, type Rows, type Snapshot } from "./roster.ts";

export type Mode = "preview" | "apply";
/**
 * Which mode a request runs in. A command user's call defaults to preview. The scheduler defaults to apply,
 * but may ask for "preview", which is how the very first import is dry-run before anything is applied
 * (no command user exists before the first import).
 */
export function selectMode(scheduled: boolean, requested: unknown): Mode {
  if (scheduled) return requested === "preview" ? "preview" : "apply";
  return requested === "apply" ? "apply" : "preview";
}

export type RunStatus = "applied" | "no_changes" | "preview" | "rejected" | "failed";

export interface SyncDeps {
  readSheets(): Promise<{ roster: Rows; divisions: Rows }>;
  loadCurrent(): Promise<CurrentMember[]>;
  lastAppliedHash(): Promise<string | null>;
  /** Position count of the last applied snapshot, or null before the first import. */
  lastPositionCount(): Promise<number | null>;
  /**
   * Writes the snapshot. Members missing from it are NOT marked former by this call alone: the database keeps them active
   * and counts independent absences (see migration 20261105000100). Only IDs in approvedRemovals are removed at once.
   */
  apply(snapshot: Snapshot, approvedRemovals: string[]): Promise<{ members: number; markedFormer: number; pendingRemoval: number }>;
  hash(s: string): Promise<string>;
}

export interface SyncResult {
  status: RunStatus;
  hash: string | null;
  counts: { positions: number; members: number; vacant: number; divisionSlots: number; added: number; updated: number; removed: number };
  issues: Issue[];
  changes: Change[];
  /** What the database did with members missing from the sheet (apply only). */
  outcome?: { markedFormer: number; pendingRemoval: number };
  error?: string;
}

const empty = { positions: 0, members: 0, vacant: 0, divisionSlots: 0, added: 0, updated: 0, removed: 0 };

/**
 * opts.confirmRemovals is an explicit approval by a command user. It is only honored together with expectedHash, the hash
 * of the preview they reviewed, so they approve exactly the removals they saw and not whatever the sheet says a minute later.
 * The scheduler never passes it.
 */
export async function runRosterSync(deps: SyncDeps, mode: Mode, opts: { confirmRemovals?: boolean; expectedHash?: string | null } = {}): Promise<SyncResult> {
  let sheets: { roster: Rows; divisions: Rows };
  try {
    sheets = await deps.readSheets();
  } catch (e) {
    return { status: "failed", hash: null, counts: empty, issues: [], changes: [], error: (e as Error).message };
  }

  const built = buildSnapshot(parseRoster(sheets.roster), parseDivisions(sheets.divisions));
  let current: CurrentMember[];
  try {
    current = await deps.loadCurrent();
  } catch (e) {
    return { status: "failed", hash: null, counts: empty, issues: built.issues, changes: [], error: (e as Error).message };
  }
  const changes = diffMembers(current, built.snapshot.members);
  const issues = [...built.issues];
  const guard = removalGuard(current.filter((m) => m.status === "active").length, changes, !!opts.confirmRemovals);
  if (guard) issues.push(guard);
  let previousPositions: number | null;
  try {
    previousPositions = await deps.lastPositionCount();
  } catch (e) {
    return { status: "failed", hash: null, counts: empty, issues: built.issues, changes: [], error: (e as Error).message };
  }
  const shrink = positionShrinkGuard(previousPositions, built.snapshot.positions.length, !!opts.confirmRemovals);
  if (shrink) issues.push(shrink);

  const hash = await deps.hash(canonical(built.snapshot));
  if (opts.confirmRemovals && opts.expectedHash !== hash)
    issues.push({
      severity: "error",
      code: "approval_stale",
      sheet: "TPD Roster",
      message: opts.expectedHash ? "The roster sheet changed after you previewed it. Preview again and review the changes before approving." : "Removals can only be approved for a snapshot you previewed. Preview first, then approve.",
    });
  const counts = {
    positions: built.snapshot.positions.length,
    members: built.snapshot.members.length,
    vacant: built.snapshot.positions.filter((p) => !p.discordId).length,
    divisionSlots: built.snapshot.divisionSlots.length,
    added: changes.filter((c) => c.kind === "added").length,
    updated: changes.filter((c) => c.kind === "updated").length,
    removed: changes.filter((c) => c.kind === "removed").length,
  };
  const blocked = issues.some((i) => i.severity === "error");

  if (mode === "preview") return { status: "preview", hash, counts, issues, changes };
  if (blocked) return { status: "rejected", hash, counts, issues, changes };
  if (!changes.length && (await deps.lastAppliedHash()) === hash) return { status: "no_changes", hash, counts, issues, changes };

  const approved = opts.confirmRemovals ? changes.filter((c) => c.kind === "removed").map((c) => c.discordId) : [];
  let outcome: { markedFormer: number; pendingRemoval: number };
  try {
    const r = await deps.apply(built.snapshot, approved);
    outcome = { markedFormer: r.markedFormer, pendingRemoval: r.pendingRemoval };
  } catch (e) {
    return { status: "failed", hash, counts, issues, changes, error: (e as Error).message };
  }
  return { status: "applied", hash, counts, issues, changes, outcome };
}

/** Changes as returned to the browser: names and call signs, no Discord IDs. */
export function publicChanges(changes: Change[]) {
  return changes.map((c) => {
    const { discordId: _id, ...rest } = c;
    return rest;
  });
}
