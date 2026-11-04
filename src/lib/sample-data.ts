/**
 * FICTIONAL DEMO DATA for the design preview (labelled "Sample" in the UI).
 *
 * Every person, number and request below is invented to exercise the layouts.
 * None of it describes real TPD members or real activity: the names below are
 * invented personas used to demonstrate patrol, requests and command workflows.
 * Verified department information lives in src/lib/department. Real member
 * data arrives with Discord sign-in (Milestone 2) and replaces this file.
 */

import { RANKS, type Rank } from "./authz";
import { TRAINING_PATHWAY, type TrainingStepKey } from "./department";
export { RANKS, type Rank };

export type District = "North" | "South" | "Department";
export type Status = "Active" | "On leave" | "Probationary" | "Suspended";

export interface Member {
  id: string;
  name: string;
  callsign: string;
  rank: Rank;
  district: District;
  appointment: string;
  divisions: string[];
  status: Status;
  weekMinutes: number;
  onDuty: boolean;
  timezone: string;
}

export const ME: Member = {
  id: "m-07",
  name: "R. Delgado",
  callsign: "X-414",
  rank: "Senior Officer",
  district: "North",
  appointment: "Senior Patrol Officer",
  divisions: ["Waterfront Unit"],
  status: "Active",
  weekMinutes: 105,
  onDuty: false,
  timezone: "EST",
};

export const MEMBERS: Member[] = [
  { id: "m-01", name: "A. Whitfield", callsign: "X-101", rank: "Chief of Police", district: "Department", appointment: "Overall Operations", divisions: [], status: "Active", weekMinutes: 240, onDuty: false, timezone: "PST" },
  { id: "m-02", name: "D. Okafor", callsign: "X-102", rank: "Deputy Chief", district: "Department", appointment: "Administrative Operations", divisions: [], status: "Active", weekMinutes: 195, onDuty: true, timezone: "EST" },
  { id: "m-03", name: "S. Lindqvist", callsign: "X-203", rank: "Major", district: "Department", appointment: "Patrol Operations", divisions: [], status: "Active", weekMinutes: 150, onDuty: false, timezone: "CST" },
  { id: "m-04", name: "P. Moreau", callsign: "X-309", rank: "Captain", district: "Department", appointment: "Waterfront Unit Commander", divisions: ["Waterfront Unit"], status: "Active", weekMinutes: 200, onDuty: true, timezone: "EST" },
  { id: "m-05", name: "T. Nakamura", callsign: "X-313", rank: "Lieutenant", district: "North", appointment: "North District Command", divisions: ["SWAT"], status: "On leave", weekMinutes: 0, onDuty: false, timezone: "MST" },
  { id: "m-06", name: "J. Abernathy", callsign: "X-401", rank: "Sergeant", district: "North", appointment: "North District Supervisor", divisions: ["Traffic Interdiction Unit"], status: "Active", weekMinutes: 225, onDuty: true, timezone: "EST" },
  ME,
  { id: "m-08", name: "K. Osei", callsign: "X-412", rank: "Corporal", district: "North", appointment: "Patrol Aide", divisions: ["Waterfront Unit", "SWAT"], status: "Active", weekMinutes: 60, onDuty: false, timezone: "EST" },
  { id: "m-09", name: "L. Brennan", callsign: "X-425", rank: "Officer", district: "North", appointment: "Patrol Bureau", divisions: [], status: "Active", weekMinutes: 190, onDuty: true, timezone: "PST" },
  { id: "m-10", name: "M. Castellanos", callsign: "X-445", rank: "Probationary Officer", district: "North", appointment: "Field Training Program", divisions: [], status: "Probationary", weekMinutes: 45, onDuty: false, timezone: "EST" },
  { id: "m-11", name: "E. Varga", callsign: "X-501", rank: "Sergeant", district: "South", appointment: "South District Supervisor", divisions: [], status: "Active", weekMinutes: 130, onDuty: false, timezone: "CST" },
  { id: "m-12", name: "H. Adeyemi", callsign: "X-525", rank: "Officer", district: "South", appointment: "Patrol Bureau", divisions: ["Traffic Interdiction Unit"], status: "Active", weekMinutes: 20, onDuty: false, timezone: "EST" },
  { id: "m-13", name: "C. Fontaine", callsign: "X-545", rank: "Probationary Officer", district: "South", appointment: "Field Training Program", divisions: [], status: "Probationary", weekMinutes: 90, onDuty: true, timezone: "EST" },
  { id: "m-14", name: "B. Halvorsen", callsign: "X-549", rank: "Reserve Officer", district: "South", appointment: "Patrol Bureau", divisions: [], status: "Active", weekMinutes: 0, onDuty: false, timezone: "MST" },
];

// Official department structure (fleet, divisions) comes from the verified module.
export { VEHICLES, vehicleAuthorized, DIVISIONS } from "./department";

export type RequestState = "Draft" | "Submitted" | "Under review" | "Approved" | "Denied" | "Withdrawn";

export interface WorkRequest {
  id: string;
  type: "Leave of absence" | "LOA extension" | "Activity correction" | "Division application" | "Ride-along" | "Transfer" | "Training enrollment";
  member: string;
  callsign: string;
  summary: string;
  state: RequestState;
  reviewer: string | null;
  submitted: string;
  due?: string;
}

export const REQUESTS: WorkRequest[] = [
  { id: "REQ-1042", type: "Leave of absence", member: "T. Nakamura", callsign: "X-313", summary: "Nov 3 to Nov 14 · academic exams", state: "Approved", reviewer: "S. Lindqvist", submitted: "Oct 31" },
  { id: "REQ-1047", type: "Activity correction", member: "R. Delgado", callsign: "X-414", summary: "Session ended 40 min late after disconnect", state: "Under review", reviewer: "J. Abernathy", submitted: "Nov 2", due: "Nov 4" },
  { id: "REQ-1049", type: "Division application", member: "L. Brennan", callsign: "X-425", summary: "Traffic Interdiction Unit", state: "Submitted", reviewer: null, submitted: "Nov 2" },
  { id: "REQ-1050", type: "Ride-along", member: "C. Fontaine", callsign: "X-545", summary: "Civilian observer, Nov 5 evening", state: "Submitted", reviewer: "E. Varga", submitted: "Nov 3", due: "Nov 5" },
  { id: "REQ-1051", type: "LOA extension", member: "T. Nakamura", callsign: "X-313", summary: "Extend to Nov 21 · family obligation", state: "Under review", reviewer: "D. Okafor", submitted: "Nov 3", due: "Nov 14" },
  { id: "REQ-1038", type: "Transfer", member: "H. Adeyemi", callsign: "X-525", summary: "North to South district", state: "Denied", reviewer: "S. Lindqvist", submitted: "Oct 30" },
  { id: "REQ-1053", type: "Activity correction", member: "K. Osei", callsign: "X-412", summary: "Missing 25 min from Nov 1 session", state: "Draft", reviewer: null, submitted: "—" },
];

export interface PatrolSession {
  id: string;
  date: string;
  district: District;
  start: string;
  end: string;
  minutes: number;
  flag?: "Correction pending" | "Auto-closed";
}

export const MY_SESSIONS: PatrolSession[] = [
  { id: "PS-2291", date: "Mon, Nov 2", district: "North", start: "19:05", end: "20:10", minutes: 65 },
  { id: "PS-2276", date: "Sun, Nov 1", district: "North", start: "21:30", end: "22:10", minutes: 40, flag: "Correction pending" },
  { id: "PS-2240", date: "Thu, Oct 29", district: "South", start: "18:00", end: "19:45", minutes: 105 },
  { id: "PS-2214", date: "Tue, Oct 27", district: "North", start: "20:15", end: "21:40", minutes: 85 },
];

/**
 * HB §3.1 pathway steps are official (src/lib/department/policy.ts). The
 * progress states below are SAMPLE values for the fictional demo persona only,
 * so the trainee layout can be reviewed. No real sign-offs are recorded.
 */
const SAMPLE_PROGRESS: Record<TrainingStepKey, "Complete" | "In progress" | "Not started"> = {
  onboarding: "Complete",
  policy: "Complete",
  anchorcad: "In progress",
  radio: "Not started",
  patrol: "Not started",
  pto: "Not started",
  approval: "Not started",
};

export const TRAINING_MODULES = TRAINING_PATHWAY.map((step) => ({ ...step, state: SAMPLE_PROGRESS[step.key] }));
