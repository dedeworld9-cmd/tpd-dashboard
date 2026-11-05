import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTHORIZATION, DISCIPLINE, DISTRICTS, DIVISIONS, POSITIONS, TRAINING_PATHWAY, VEHICLES, byTier, divisionStaffing, staffing, vehicleAuthorized } from "@/lib/department";

describe("department data matches the official roster (checked 2026-11-04)", () => {
  it("has 134 authorized positions with 13 sworn members, as on Numbers by Rank", () => {
    const s = staffing();
    expect(s.authorized).toBe(134);
    expect(s.filled).toBe(13);
    expect(s.activeDuty).toEqual({ filled: 13, authorized: 126 });
    expect(s.probationary).toEqual({ filled: 0, authorized: 8 });
  });

  it("matches per-rank totals on Numbers by Rank", () => {
    const count = (rank: string) => POSITIONS.filter((p) => p.rank === rank);
    const expected: Record<string, [number, number]> = {
      "Chief of Police": [1, 1],
      "Deputy Chief": [1, 1],
      "Assistant Chief": [2, 2],
      Major: [1, 3],
      Sergeant: [1, 12],
      Corporal: [1, 12],
      "Senior Officer": [0, 24],
      Officer: [2, 40],
      "Reserve Officer": [0, 8],
      "Probationary Officer": [0, 8],
    };
    for (const [rank, [filled, total]] of Object.entries(expected)) {
      const rows = count(rank);
      expect([rows.filter((r) => r.holder).length, rows.length], rank).toEqual([filled, total]);
    }
    // Captains: 3 Command Staff (incl. FTD) + 7 Division Command; Lieutenants: 6 division + 7 field.
    expect(count("Captain").length).toBe(10);
    expect(count("Lieutenant").length).toBe(13);
  });

  it("keeps call signs unique", () => {
    const signs = POSITIONS.map((p) => p.callsign).filter(Boolean);
    expect(new Set(signs).size).toBe(signs.length);
  });

  it("puts the Chief of Police at X-101", () => {
    expect(byTier("Office of the Chiefs")[0]).toMatchObject({ callsign: "X-101", rank: "Chief of Police", holder: "J. Quinellope" });
  });

  it("has two districts of 56 positions each, 4 members in North", () => {
    expect(DISTRICTS.map((d) => [d.name, d.authorized, d.filled])).toEqual([
      ["North", 56, 4],
      ["South", 56, 0],
    ]);
  });

  it("lists the six divisions with Divisions-tab slot counts and holders", () => {
    expect(DIVISIONS.map((d) => [d.prefix, d.capacity, divisionStaffing(d).filled])).toEqual([
      ["W", 12, 3],
      ["T", 12, 1],
      ["PA", 5, 0],
      ["IA", 6, 0],
      ["D", 10, 0],
      ["A", 22, 1],
    ]);
  });

  it("transcribes the fleet matrix, including Corporal on the 2019 FPIU", () => {
    expect(VEHICLES).toHaveLength(3);
    expect(vehicleAuthorized("Corporal", VEHICLES[1])).toBe(true);
    expect(vehicleAuthorized("Officer", VEHICLES[1])).toBe(false);
    expect(vehicleAuthorized("Reserve Officer", VEHICLES[0])).toBe(true);
    expect(vehicleAuthorized("Senior Officer", VEHICLES[2])).toBe(false);
    expect(Object.keys(AUTHORIZATION)).toHaveLength(12);
  });

  it("has the seven-step HB §3.1 pathway and the HB §13 ladder", () => {
    expect(TRAINING_PATHWAY).toHaveLength(7);
    expect(TRAINING_PATHWAY.at(-1)?.key).toBe("approval");
    expect(DISCIPLINE.levels.map((l) => [l.name, l.points])).toEqual([
      ["Warning", 1],
      ["Strike", 3],
      ["Blackmark", 5],
      ["Suspension", null],
      ["Demotion", null],
      ["Termination", null],
    ]);
  });
});

describe("public repository hygiene", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|json|md)$/.test(p)) files.push(p);
    }
  };
  walk("src");

  it("contains no Discord user IDs (17–20 digit snowflakes) in src", () => {
    const hits = files.filter((f) => /\b\d{17,20}\b/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });

  it("has no member disciplinary points in the department data", () => {
    const text = files
      .filter((f) => f.includes("department"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(text).not.toMatch(/Points \(Safe\)/);
  });
});
