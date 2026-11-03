/**
 * Read-only views over preview state used by several screens. Pure functions
 * so they can be unit tested and later re-pointed at server queries.
 */
import { dailyMinutes, weekMinutes, weekStart, DEFAULT_WEEK, REQUIRED_MINUTES, type Interval } from "@/lib/domain/activity";
import { MEMBERS, type Member } from "@/lib/sample-data";
import type { PreviewState, SessionRecord } from "./store";

/** Closed sessions plus the open one counted up to `now`. */
export function intervalsFor(sessions: SessionRecord[], memberId: string, now: number): Interval[] {
  return sessions.filter((s) => s.memberId === memberId).map((s) => ({ start: s.start, end: s.end ?? now }));
}

export function memberWeek(s: PreviewState, memberId: string, now: number): number {
  return weekMinutes(intervalsFor(s.sessions, memberId, now), new Date(now));
}

export function memberDaily(s: PreviewState, memberId: string, now: number): number[] {
  return dailyMinutes(intervalsFor(s.sessions, memberId, now), new Date(now));
}

/** Weekly totals for the last `weeks` weeks, oldest first, the current week last. */
export function memberTrend(s: PreviewState, memberId: string, now: number, weeks = 6): { label: string; minutes: number }[] {
  const ivs = intervalsFor(s.sessions, memberId, now);
  const out: { label: string; minutes: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const probe = new Date(now - w * 7 * 86400000);
    const start = weekStart(probe, DEFAULT_WEEK);
    out.push({
      label: w === 0 ? "This wk" : start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: DEFAULT_WEEK.timeZone }),
      minutes: weekMinutes(ivs, probe),
    });
  }
  return out;
}

/**
 * Exempt from the weekly requirement: approved LOA (HB §5.4, R-ACT-3) and
 * probationary officers not yet approved for independent patrol (HB §3.2, R-ACT-4).
 */
export function isExempt(m: Member) {
  return m.status === "On leave" || m.status === "Probationary";
}

export function exemptReason(m: Member): string | null {
  if (m.status === "On leave") return "On approved leave (Handbook §5.4)";
  if (m.status === "Probationary") return "In field training until approved for independent patrol (Handbook §3.2)";
  return null;
}

export type Band = "met" | "on-track" | "at-risk" | "exempt";

/** Compliance band for the current week. "On track" means at least half done. */
export function band(m: Member, minutes: number): Band {
  if (isExempt(m)) return "exempt";
  if (minutes >= REQUIRED_MINUTES) return "met";
  if (minutes >= REQUIRED_MINUTES / 2) return "on-track";
  return "at-risk";
}

export interface RosterRow {
  member: Member;
  week: number;
  onDuty: SessionRecord | null;
  band: Band;
}

export function roster(s: PreviewState, now: number): RosterRow[] {
  return MEMBERS.map((m) => {
    const week = memberWeek(s, m.id, now);
    return { member: m, week, onDuty: s.sessions.find((x) => x.memberId === m.id && x.end === null) ?? null, band: band(m, week) };
  });
}

export function openRequests(s: PreviewState) {
  return s.requests.filter((r) => r.state === "Submitted" || r.state === "Under review");
}
