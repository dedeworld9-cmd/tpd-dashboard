/**
 * Official TPD sources this module was transcribed from, and when.
 *
 * The data files in src/lib/department are a hand-checked snapshot of these
 * sources. They are not live: when a source changes, the snapshot must be
 * re-verified and VERIFIED_ON updated. Restricted tabs (Hire Logs, Records)
 * are read for verification only and are never copied into this repository,
 * because the repository and the preview site are public.
 */

export const VERIFIED_ON = "2026-11-04";

export const SOURCES = {
  roster: {
    label: "Tampa Police Department roster (Google Sheet)",
    href: "https://docs.google.com/spreadsheets/d/1uWDH1g8BBlHDzzGaAvNH4FmQllbBtnjLPl-NtzdU0Zk/edit",
    tabs: ["TPD Roster", "TPD | Divisions", "TPD | Vehicles", "TPD - Numbers by Rank"],
  },
  handbook: {
    label: "Personnel Policy & Procedures Handbook",
    short: "HB",
    href: "https://docs.google.com/document/d/1SaGo6T7H6BoyFa7jof6S6HMxsmxq8Gh2Q0QUc5FlpkE/edit",
    effective: "2026-10-30",
    lastModified: "2026-10-31",
    approvedBy: "Chief of Police",
  },
  useOfForce: {
    label: "Use of Force Policy",
    short: "UoF",
    href: "https://docs.google.com/document/d/1OYbv_Wvv9s_eLT9Vndtg4v6o3K9StBtLNdG4ROvB2FE/edit",
    effective: "2026-10-30",
    lastModified: "2026-10-31",
    approvedBy: "Chief of Police",
  },
  application: {
    label: "Recruitment application (Google Form, 29 questions)",
    href: "https://forms.gle/EG78MZdQdgMdLoYX8",
  },
} as const;

/** Data that exists in the sources but must never be copied into public code or assets. */
export const RESTRICTED = [
  "Discord user IDs (roster, divisions, hire logs)",
  "Roblox usernames and hire or resignation dates (TPD | Hire Logs)",
  "Disciplinary points and actions (TPD Roster POINTS column, TPD | Records)",
  "Timezones of individual members",
] as const;
