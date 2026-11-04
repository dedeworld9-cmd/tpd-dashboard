/**
 * Department policy content, quoted or closely summarized from the official
 * documents with their section numbers. The Google Docs remain authoritative.
 * See ./sources.ts for the documents and docs/POLICY_CONFLICTS.md for gaps.
 */

/** HB §1. */
export const PURPOSE = [
  "Promote professionalism, integrity, and accountability throughout the department.",
  "Establish consistent operational standards across all divisions and subdivisions.",
  "Ensure personnel understand their responsibilities and expectations.",
  "Maintain public trust through ethical and professional service.",
  "Provide guidance for training, supervision, discipline, and career development.",
] as const;

/** HB §2. */
export const CORE_VALUES = [
  { title: "Integrity", body: "Act honestly, ethically, and transparently in all duties." },
  { title: "Accountability", body: "Accept responsibility for actions and decisions, including mistakes." },
  { title: "Service", body: "Prioritize the safety and well-being of the community above all." },
  { title: "Professionalism", body: "Maintain appropriate conduct, appearance, and communication at all times." },
  { title: "Respect", body: "Treat all individuals with dignity, fairness, and impartiality." },
] as const;

/** HB §3.2. */
export const ACTIVITY_REQUIREMENT = {
  minutesPerWeek: 180,
  cite: "HB §3.2",
  summary: "Three (3) hours of documented patrol activity per week, for all TPD personnel regardless of division or assignment. Divisions may not set their own quotas.",
  exceptions: [
    "Approved Leave of Absence (LOA)",
    "Department assignments",
    "Training requirements",
    "Personal circumstances approved by command staff",
    "Other circumstances approved through the chain of command",
  ],
  consequences: ["Administrative review", "Loss of specialized assignment eligibility", "Promotion restrictions", "Corrective action"],
  probationNote: "Officers completing PTO are exempt until approved for independent patrol.",
} as const;

/**
 * HB §3.1: the six requirements before independent patrol, then approval by
 * the Office of the Chiefs. Steps only; no member's progress is recorded here.
 */
export const TRAINING_PATHWAY = [
  { key: "onboarding", title: "TPD onboarding", detail: "Department structure and chain of command." },
  { key: "policy", title: "Policy and procedures review", detail: "Personnel Handbook and Use of Force Policy." },
  { key: "anchorcad", title: "AnchorCAD training", detail: "Filing arrests, citations and incidents (HB §10)." },
  { key: "radio", title: "Radio communication training", detail: "Call signs and radio procedure (HB §9.1)." },
  { key: "patrol", title: "Patrol procedures training", detail: "Patrol operations, pursuits and jurisdiction (HB §7)." },
  { key: "pto", title: "PTO Mentorship Program", detail: "Training with a Police Training Officer selected and approved by the Office of the Chiefs." },
  { key: "approval", title: "Independent patrol approval", detail: "The Office of the Chiefs approves the officer for independent patrol and probation ends." },
] as const;

export type TrainingStepKey = (typeof TRAINING_PATHWAY)[number]["key"];

/** HB §13 and §13.1. Policy only: no member's record is stored anywhere in this app. */
export const DISCIPLINE = {
  cite: "HB §13",
  levels: [
    { name: "Warning", points: 1, scope: "Infraction" },
    { name: "Strike", points: 3, scope: "Minor violations" },
    { name: "Blackmark", points: 5, scope: "Major violations" },
    { name: "Suspension", points: null, scope: "Serious or repeated violations" },
    { name: "Demotion", points: null, scope: "Failure in supervisory roles or job performance responsibilities" },
    { name: "Termination", points: null, scope: "Severe misconduct or repeated failures" },
  ],
  authority:
    "Only Lieutenant and above may issue formal disciplinary actions. Sergeants identify, document and report violations through the chain of command unless specifically authorized by the Chief of Police (HB §13.1).",
} as const;

/** HB §9.2. */
export const PROMOTION_ELIGIBILITY = [
  "Maintain a minimum of three (3) hours of documented patrol activity each week.",
  "Consistently submit accurate, thorough, and professional reports.",
  "Demonstrate leadership through initiative, teamwork, mentorship, professionalism and accountability.",
  "Maintain satisfactory disciplinary standing and comply with all policies and procedures.",
  "Successfully perform the duties and responsibilities of the current rank.",
] as const;

export type PolicyCategory = "Standards & conduct" | "Personnel" | "Operations" | "Use of force" | "Training" | "Discipline";

export interface PolicyEntry {
  doc: "HB" | "UoF";
  section: string;
  title: string;
  category: PolicyCategory;
}

/** Section index of both documents, for the policy library. Titles match the documents. */
export const POLICY_LIBRARY: PolicyEntry[] = [
  { doc: "HB", section: "1", title: "Purpose", category: "Standards & conduct" },
  { doc: "HB", section: "2", title: "Core Values", category: "Standards & conduct" },
  { doc: "HB", section: "3", title: "Employment Standards", category: "Personnel" },
  { doc: "HB", section: "3.1", title: "Hiring & Entry Pathways", category: "Training" },
  { doc: "HB", section: "3.2", title: "Minimum Activity Requirement", category: "Personnel" },
  { doc: "HB", section: "4", title: "Code of Conduct", category: "Standards & conduct" },
  { doc: "HB", section: "4.1", title: "Personnel Integrity & Dual Affiliation Policy", category: "Standards & conduct" },
  { doc: "HB", section: "5", title: "Transfers & Interagency Movement", category: "Personnel" },
  { doc: "HB", section: "5.4", title: "Leave of Absence (LOA)", category: "Personnel" },
  { doc: "HB", section: "6", title: "Shift Management", category: "Operations" },
  { doc: "HB", section: "7", title: "Vehicle Pursuit Authorization", category: "Operations" },
  { doc: "HB", section: "7.1", title: "Response to Resistance / Use of Force Policy", category: "Use of force" },
  { doc: "HB", section: "7.2", title: "Interagency Jurisdiction Notification Policy", category: "Operations" },
  { doc: "HB", section: "8", title: "Uniform & Appearance Standards", category: "Standards & conduct" },
  { doc: "HB", section: "9", title: "Rank Structure & Responsibilities", category: "Personnel" },
  { doc: "HB", section: "9.1", title: "Subdivision Call Signs", category: "Operations" },
  { doc: "HB", section: "9.2", title: "Promotion Eligibility Requirements", category: "Personnel" },
  { doc: "HB", section: "9.3", title: "Specialized Subdivision Assignments", category: "Personnel" },
  { doc: "HB", section: "9.4", title: "Command Assignment Separation", category: "Personnel" },
  { doc: "HB", section: "10", title: "Field Logging & Reporting", category: "Operations" },
  { doc: "HB", section: "10.1", title: "Body-Worn Camera (Bodycam) Policy", category: "Operations" },
  { doc: "HB", section: "11", title: "Vehicle Policy", category: "Operations" },
  { doc: "HB", section: "12", title: "Training & Professional Development", category: "Training" },
  { doc: "HB", section: "12.1", title: "Ride-Along Policy", category: "Operations" },
  { doc: "HB", section: "13", title: "Discipline & Accountability", category: "Discipline" },
  { doc: "HB", section: "13.1", title: "Authority to Issue Disciplinary Infractions", category: "Discipline" },
  { doc: "HB", section: "13.2", title: "Administrative Investigation Compliance", category: "Discipline" },
  { doc: "HB", section: "14", title: "Compliance", category: "Standards & conduct" },
  { doc: "HB", section: "14.1", title: "Social Media & Public Conduct", category: "Standards & conduct" },
  { doc: "HB", section: "15", title: "Final Directive", category: "Standards & conduct" },
  { doc: "UoF", section: "1.1–1.3", title: "Introduction, documentation and policy", category: "Use of force" },
  { doc: "UoF", section: "2.1", title: "De-Escalation", category: "Use of force" },
  { doc: "UoF", section: "2.2", title: "Less Lethal Force", category: "Use of force" },
  { doc: "UoF", section: "2.3–2.4", title: "Deadly Force and unauthorized use of deadly force", category: "Use of force" },
  { doc: "UoF", section: "2.5", title: "Prohibit Firing at a Moving Motor Vehicle", category: "Use of force" },
  { doc: "UoF", section: "2.6–2.7", title: "Force continuum, levels of force and decision making", category: "Use of force" },
  { doc: "UoF", section: "2.8", title: "Duty to Intervene", category: "Use of force" },
  { doc: "UoF", section: "2.9", title: "Duty to Render Aid", category: "Use of force" },
  { doc: "UoF", section: "2.10", title: "“Good Samaritan” Law", category: "Use of force" },
];
