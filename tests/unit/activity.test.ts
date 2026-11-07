import { describe, expect, it } from "vitest";
import { dailyMinutes, formatClock, formatMinutes, overlapMinutes, weekMinutes, weekStart } from "@/lib/domain/activity";

const ny = (iso: string) => new Date(iso).getTime();

describe("weekStart()", () => {
  it("starts Monday 00:00 America/New_York", () => {
    // Wed Nov 4 2026, 15:00 EST
    expect(weekStart(new Date("2026-11-04T20:00:00Z")).toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
  it("is DST-safe across the November fall-back", () => {
    // Week containing Sun Nov 1 2026 (DST ends 02:00) started Mon Oct 26 at 00:00 EDT.
    expect(weekStart(new Date("2026-11-01T12:00:00Z")).toISOString()).toBe("2026-10-26T04:00:00.000Z");
  });
});

describe("weekMinutes()", () => {
  it("splits a session that spans the week boundary", () => {
    // Sun Nov 1 23:00 EST to Mon Nov 2 01:00 EST: one hour on each side.
    const s = { start: ny("2026-11-02T04:00:00Z"), end: ny("2026-11-02T06:00:00Z") };
    expect(weekMinutes([s], new Date("2026-11-03T15:00:00Z"))).toBe(60);
    expect(weekMinutes([s], new Date("2026-11-01T15:00:00Z"))).toBe(60);
  });
  it("puts each day's minutes in its own bucket", () => {
    const s = { start: ny("2026-11-03T23:00:00Z"), end: ny("2026-11-04T00:30:00Z") }; // Tue 18:00–19:30 EST
    expect(dailyMinutes([s], new Date("2026-11-04T15:00:00Z"))).toEqual([0, 90, 0, 0, 0, 0, 0]);
  });
});

describe("formatting", () => {
  it("formats minutes and clocks", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(65)).toBe("1h 5m");
    expect(formatMinutes(180)).toBe("3h");
    expect(formatClock(3725)).toBe("01:02:05");
  });
  it("never counts negative overlap", () => {
    expect(overlapMinutes({ start: 10, end: 20 }, 30, 40)).toBe(0);
  });
});
