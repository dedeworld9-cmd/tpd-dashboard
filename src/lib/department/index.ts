/**
 * The single source for verified TPD department information on the site.
 * Everything here is transcribed from the official sources in ./sources.ts.
 * Fictional demo data lives in src/lib/sample-data.ts and must stay labelled.
 */

import { POSITIONS, byDistrict, isFilled, type DistrictName } from "./roster";

export * from "./sources";
export * from "./roster";
export * from "./divisions";
export * from "./fleet";
export * from "./policy";

export const DEPARTMENT = {
  name: "Tampa Police Department",
  short: "TPD",
  community: "Florida State Roleplay",
  game: "Roblox Emergency Response: Liberty County (ER:LC)",
  reporting: "AnchorCAD",
} as const;

export interface DistrictInfo {
  name: DistrictName;
  callsignRange: string;
  captain: string;
  authorized: number;
  filled: number;
}

const range: Record<DistrictName, string> = { North: "X-401 – X-452", South: "X-501 – X-552" };
const captain: Record<DistrictName, string> = { North: "X-204", South: "X-205" };

/** Patrol districts. Counts cover the district's Captain, Lieutenants and its 52-slot block. */
export const DISTRICTS: DistrictInfo[] = (["North", "South"] as const).map((name) => {
  const all = byDistrict(name);
  return { name, callsignRange: range[name], captain: captain[name], authorized: all.length, filled: all.filter(isFilled).length };
});

export function positionByCallsign(callsign: string) {
  return POSITIONS.find((x) => x.callsign === callsign);
}
