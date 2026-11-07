/**
 * Synthetic workbook rows laid out like the official roster (blank lead rows,
 * title row, header in column E onwards, star section headings, spacer rows,
 * vacant slots, a POINTS column). IDs are fake 18-digit numbers.
 */
import type { Rows } from "../../../supabase/functions/_shared/roster.ts";

export const id = (n: number) => `9${String(n).padStart(17, "0")}`;
const pad = ["", "", "", ""];
const row = (callsign: string, name: string, discord: string, rank: string, appt: string, tz = "N/A") => [...pad, callsign, name, discord, "", rank, appt, "", tz, "0 Points (Safe)"];

export function rosterRows(over: { extra?: Rows; mutate?: (rows: Rows) => void } = {}): Rows {
  const rows: Rows = [
    [],
    [],
    [],
    [],
    [...pad, "TAMPA POLICE DEPARTMENT ROSTER"],
    [],
    [...pad, "CALL SIGN", "NAME", "DISCORD USER ID", "", "POSITION", "APPOINTMENT", "", "TIMEZONE", "POINTS"],
    [],
    [...pad, "★★★★  |  Office of the Chiefs  |  ★★★★"],
    [],
    row("X-101", "A. Chief", id(1), "Chief of Police", "Overall Operations", "PST"),
    row("X-102", "B. Deputy", id(2), "Deputy Chief", "Administrative Operations", "EST"),
    [],
    [...pad, "★★★  |  Command Staff  |  ★★★"],
    [],
    row("X-204", "", "", "Captain", "Patrol Operations (North District)"),
    [],
    [...pad, "★★★  |  Division Command  |  ★★★"],
    [],
    row("X-309", "C. Captain", id(3), "Captain", "Waterfront Unit Commander", "EST"),
    row("", "", "", "Captain", "TBD Commander"),
    [],
    [...pad, "★★  |  Field Supervisory  |  ★★"],
    [],
    row("X-313", "", "", "Lieutenant", "North District Command"),
    [],
    [],
    row("X-401", "D. Sergeant", id(4), "Sergeant", "North District Supervisor", "EST"),
    row("X-412", "E. Corporal", id(5), "Corporal", "Patrol Aide", "EST"),
    row("X-425", "F. Officer", id(6), "Officer", "Patrol Bureau", "PST"),
    row("X-445", "", "", "Probationary Officer", "Field Training Program"),
    [],
    [...pad, "★  |  South District  |  ★"],
    [],
    row("X-501", "", "", "Sergeant", "South District Supervisor"),
    row("X-525", "G. South", id(7), "Officer", "Patrol Bureau", ""),
  ];
  if (over.extra) rows.push(...over.extra);
  over.mutate?.(rows);
  return rows;
}

const drow = (callsign: string, name: string, discord: string, role: string, title: string) => [...pad, callsign, name, discord, "", role, title, "", ""];

export function divisionRows(): Rows {
  return [
    [],
    [],
    [],
    [],
    [...pad, "TAMPA POLICE DEPARTMENT DIVISIONS"],
    [],
    [...pad, "CALL SIGN", "NAME", "DISCORD USER ID", "", "POSITION", "APPOINTMENT", "", "TIMEZONE"],
    [],
    [...pad, 'Waterfront Unit "Whiskey"'],
    [],
    drow("W-01", "C. Captain", id(3), "Division Commander", "Waterfront Unit"),
    drow("W-02", "", "", "Division Assistant Commander", "Waterfront Unit"),
    drow("W-12", "E. Corporal", id(5), "Officer", "Waterfront Unit"),
    [],
    [...pad, 'Special Weapons and Tactics "Adam"'],
    [],
    drow("A-01", "", "", "Division Commander", "SWAT Commander"),
  ];
}
