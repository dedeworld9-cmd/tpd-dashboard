/**
 * Weekly activity math (HB §3.2: 3 documented hours per week).
 * Week boundary and timezone are configuration pending leadership (PC-14).
 */

export const REQUIRED_MINUTES = 180;

export interface WeekConfig {
  /** 0 = Sunday, 1 = Monday. */
  startDay: number;
  timeZone: string;
}

export const DEFAULT_WEEK: WeekConfig = { startDay: 1, timeZone: "America/New_York" };

/** Offset in minutes of `timeZone` from UTC at `date`. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Start of the activity week containing `date`, as a UTC instant. */
export function weekStart(date: Date, cfg: WeekConfig = DEFAULT_WEEK): Date {
  const offset = tzOffsetMinutes(date, cfg.timeZone);
  const local = new Date(date.getTime() + offset * 60000); // wall clock expressed in UTC fields
  const dow = local.getUTCDay();
  const back = (dow - cfg.startDay + 7) % 7;
  const localMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back);
  // Convert local midnight back to an instant (re-evaluate offset at that instant for DST).
  const guess = new Date(localMidnight - offset * 60000);
  const corrected = tzOffsetMinutes(guess, cfg.timeZone);
  return new Date(localMidnight - corrected * 60000);
}

export function weekEnd(date: Date, cfg: WeekConfig = DEFAULT_WEEK): Date {
  const start = weekStart(date, cfg);
  return weekStart(new Date(start.getTime() + 8 * 24 * 3600 * 1000), cfg);
}

export interface Interval {
  start: number; // epoch ms
  end: number; // epoch ms
}

/** Minutes of `session` that fall inside [from, to). Sessions spanning a boundary are split. */
export function overlapMinutes(session: Interval, from: number, to: number): number {
  const s = Math.max(session.start, from);
  const e = Math.min(session.end, to);
  return e > s ? Math.floor((e - s) / 60000) : 0;
}

export function weekMinutes(sessions: Interval[], now: Date, cfg: WeekConfig = DEFAULT_WEEK): number {
  const from = weekStart(now, cfg).getTime();
  const to = weekEnd(now, cfg).getTime();
  return sessions.reduce((sum, s) => sum + overlapMinutes(s, from, to), 0);
}

/** Minutes per day (7 entries, week order) for the week containing `now`. */
export function dailyMinutes(sessions: Interval[], now: Date, cfg: WeekConfig = DEFAULT_WEEK): number[] {
  const start = weekStart(now, cfg).getTime();
  // Local midnights for each day boundary (DST-safe): the "week start" of a
  // one-day week beginning on that weekday is that day's local midnight.
  const bounds: number[] = [];
  for (let d = 0; d <= 7; d++) {
    const probe = new Date(start + d * 86400000 + 3 * 3600000);
    bounds.push(weekStart(probe, { ...cfg, startDay: (cfg.startDay + d) % 7 }).getTime());
  }
  return Array.from({ length: 7 }, (_, d) =>
    sessions.reduce((sum, s) => sum + overlapMinutes(s, bounds[d], bounds[d + 1]), 0),
  );
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Sessions open longer than this are closed and flagged for review (ARCHITECTURE.md, interim 12 h). */
export const STALE_SESSION_MS = 12 * 3600 * 1000;

/** 24-hour wall-clock time (e.g. 21:30) in the viewer's timezone. */
export function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
