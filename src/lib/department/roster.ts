/**
 * Every authorized position on the TPD Roster tab (134), with the member who
 * holds it. Transcribed from the official roster; see ./sources.ts.
 *
 * Only the roleplay name shown on the roster ("J. Quinellope") is stored.
 * Discord IDs, Roblox usernames, timezones and disciplinary points are
 * deliberately left out: this file ships in a public repository and bundle.
 */

import type { Rank } from "@/lib/authz";

export type Tier = "Office of the Chiefs" | "Command Staff" | "Division Command" | "Field Supervisory" | "Patrol Bureau";
export type DistrictName = "North" | "South";

export interface Position {
  /** Roster call sign. One Division Command row ("TBD Commander") has none on the roster. */
  callsign: string | null;
  rank: Rank;
  appointment: string;
  tier: Tier;
  district: DistrictName | null;
  /** Roleplay name as written on the roster, or null when the position is vacant. */
  holder: string | null;
}

/** The tier order used on the roster and the Numbers by Rank tab, most senior first. */
export const TIERS: { tier: Tier; stars: 1 | 2 | 3 | 4 }[] = [
  { tier: "Office of the Chiefs", stars: 4 },
  { tier: "Command Staff", stars: 3 },
  { tier: "Division Command", stars: 3 },
  { tier: "Field Supervisory", stars: 2 },
  { tier: "Patrol Bureau", stars: 1 },
];

const p = (callsign: string | null, rank: Rank, appointment: string, tier: Tier, holder: string | null = null, district: DistrictName | null = null): Position => ({
  callsign,
  rank,
  appointment,
  tier,
  district,
  holder,
});

const LEADERSHIP: Position[] = [
  p("X-101", "Chief of Police", "Overall Operations", "Office of the Chiefs", "J. Quinellope"),
  p("X-102", "Deputy Chief", "Administrative Operations", "Office of the Chiefs", "K. Valenzuela"),
  p("X-103", "Assistant Chief", "Divisional Operations", "Office of the Chiefs", "S. Ramirez"),
  p("X-104", "Assistant Chief", "Patrol Operations", "Office of the Chiefs", "L. Post"),

  p("X-201", "Major", "Administrative Operations (IA | OPA)", "Command Staff"),
  p("X-202", "Major", "Division Operations", "Command Staff"),
  p("X-203", "Major", "Patrol Operations", "Command Staff", "J. Rich"),
  p("X-204", "Captain", "Patrol Operations (North District)", "Command Staff", null, "North"),
  p("X-205", "Captain", "Patrol Operations (South District)", "Command Staff", null, "South"),

  p("X-301", "Captain", "Office of Public Affairs Commander", "Division Command"),
  p("X-302", "Lieutenant", "Office of Public Affairs Assistant Commander", "Division Command"),
  p("X-303", "Captain", "Internal Affairs Division Commander", "Division Command"),
  p("X-304", "Lieutenant", "Internal Affairs Division Assistant Commander", "Division Command"),
  p("X-305", "Captain", "Traffic Interdiction Unit Commander", "Division Command", "L. Rodriguez"),
  p("X-306", "Lieutenant", "Traffic Interdiction Unit Assistant Commander", "Division Command"),
  p("X-307", "Captain", "SWAT Commander", "Division Command", "M. Hathaway"),
  p("X-308", "Lieutenant", "SWAT Assistant Commander", "Division Command"),
  p("X-309", "Captain", "Waterfront Unit Commander", "Division Command", "J. Watson"),
  p("X-310", "Lieutenant", "Waterfront Unit Assistant Commander", "Division Command", "Z. Parker"),
  p(null, "Captain", "TBD Commander", "Division Command"),
  p("X-311", "Captain", "Strategic Operations Division Commander", "Division Command"),
  p("X-312", "Lieutenant", "Strategic Operations Division Assistant Commander", "Division Command"),

  p("X-313", "Lieutenant", "North District Command", "Field Supervisory", null, "North"),
  p("X-314", "Lieutenant", "North District Command", "Field Supervisory", null, "North"),
  p("X-315", "Lieutenant", "North District Command", "Field Supervisory", null, "North"),
  p("X-316", "Lieutenant", "South District Command", "Field Supervisory", null, "South"),
  p("X-317", "Lieutenant", "South District Command", "Field Supervisory", null, "South"),
  p("X-318", "Lieutenant", "South District Command", "Field Supervisory", null, "South"),
  p("X-319", "Captain", "Field Training Division Commander", "Field Supervisory"),
  p("X-320", "Lieutenant", "Field Training Division Assistant Commander", "Field Supervisory"),
];

/** Each district block has the same 52 slots: X-401…X-452 (North) and X-501…X-552 (South). */
const DISTRICT_BLOCK: { count: number; rank: Rank; appointment: (d: DistrictName) => string; tier: Tier }[] = [
  { count: 6, rank: "Sergeant", appointment: (d) => `${d} District Supervisor`, tier: "Field Supervisory" },
  { count: 6, rank: "Corporal", appointment: () => "Patrol Aide", tier: "Patrol Bureau" },
  { count: 12, rank: "Senior Officer", appointment: () => "Senior Patrol Officer (SPO)", tier: "Patrol Bureau" },
  { count: 20, rank: "Officer", appointment: () => "Patrol Bureau", tier: "Patrol Bureau" },
  { count: 4, rank: "Probationary Officer", appointment: () => "Field Training Program", tier: "Patrol Bureau" },
  { count: 4, rank: "Reserve Officer", appointment: () => "Patrol Bureau", tier: "Patrol Bureau" },
];

/** Filled district slots on the roster, by call sign. */
const DISTRICT_HOLDERS: Record<string, string> = {
  "X-401": "J. Basit",
  "X-412": "N. Carter",
  "X-425": "M. Vargas",
  "X-426": "L. Chen",
};

function districtPositions(district: DistrictName, base: number): Position[] {
  const out: Position[] = [];
  let n = 1;
  for (const block of DISTRICT_BLOCK) {
    for (let i = 0; i < block.count; i++, n++) {
      const callsign = `X-${base + n}`;
      out.push(p(callsign, block.rank, block.appointment(district), block.tier, DISTRICT_HOLDERS[callsign] ?? null, district));
    }
  }
  return out;
}

export const POSITIONS: Position[] = [...LEADERSHIP, ...districtPositions("North", 400), ...districtPositions("South", 500)];

export const isFilled = (pos: Position) => pos.holder !== null;

/** Sworn members currently on the roster (one position each). */
export const SWORN_MEMBERS = POSITIONS.filter(isFilled);

/**
 * Headline counts, matching the Numbers by Rank tab: 134 sworn positions, of
 * which 8 are Probationary Officer slots outside "Active Duty" (126).
 */
export function staffing(positions: Position[] = POSITIONS) {
  const probationary = positions.filter((x) => x.rank === "Probationary Officer");
  const active = positions.filter((x) => x.rank !== "Probationary Officer");
  return {
    authorized: positions.length,
    filled: positions.filter(isFilled).length,
    vacant: positions.filter((x) => !isFilled(x)).length,
    activeDuty: { filled: active.filter(isFilled).length, authorized: active.length },
    probationary: { filled: probationary.filter(isFilled).length, authorized: probationary.length },
  };
}

export function byTier(tier: Tier, positions: Position[] = POSITIONS) {
  return positions.filter((x) => x.tier === tier);
}

export function byDistrict(district: DistrictName, positions: Position[] = POSITIONS) {
  return positions.filter((x) => x.district === district);
}
