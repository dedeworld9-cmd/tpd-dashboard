/**
 * The six divisions on the roster's TPD | Divisions tab, with every slot.
 * Holder names come from that tab; see ./sources.ts. Discord IDs are omitted.
 *
 * Division slots are separate from the 134 sworn positions: a member keeps
 * their department rank and call sign and also holds a division call sign
 * (e.g. the Waterfront Unit commander is Captain X-309 and W-01).
 */

export interface DivisionSlot {
  callsign: string;
  role: string;
  title: string;
  holder: string | null;
}

export interface Division {
  slug: string;
  name: string;
  /** Radio name from the Divisions tab, if it has one. */
  callsign: string;
  prefix: string;
  /** Branch from the roster appointments; null where no source assigns one (PC-07). */
  branch: string | null;
  /** Department command positions for this division on the TPD Roster tab. */
  command: { commander: string; assistant: string | null };
  slots: DivisionSlot[];
  /** Kept for existing screens: number of slots on the Divisions tab. */
  capacity: number;
}

const slots = (prefix: string, rows: [count: number, role: string, title: string][], holders: Record<number, string> = {}): DivisionSlot[] => {
  const out: DivisionSlot[] = [];
  let n = 1;
  for (const [count, role, title] of rows) {
    for (let i = 0; i < count; i++, n++) out.push({ callsign: `${prefix}-${String(n).padStart(2, "0")}`, role, title, holder: holders[n] ?? null });
  }
  return out;
};

const make = (d: Omit<Division, "capacity">): Division => ({ ...d, capacity: d.slots.length });

export const DIVISIONS: Division[] = [
  make({
    slug: "waterfront",
    name: "Waterfront Unit",
    callsign: "Whiskey",
    prefix: "W",
    branch: null,
    command: { commander: "X-309", assistant: "X-310" },
    slots: slots(
      "W",
      [
        [1, "Division Commander", "Waterfront Unit"],
        [1, "Division Assistant Commander", "Waterfront Unit"],
        [2, "Sergeant", "Waterfront Unit"],
        [8, "Officer", "Waterfront Unit"],
      ],
      { 1: "J. Watson", 2: "Z. Parker", 12: "N. Carter" },
    ),
  }),
  make({
    slug: "traffic-interdiction",
    name: "Traffic Interdiction Unit",
    callsign: "Tango",
    prefix: "T",
    branch: null,
    command: { commander: "X-305", assistant: "X-306" },
    slots: slots(
      "T",
      [
        [1, "Division Commander", "Traffic Interdiction Unit"],
        [1, "Division Assistant Commander", "Traffic Interdiction Unit"],
        [2, "Sergeant", "Traffic Interdiction Unit"],
        [8, "Officer", "Traffic Interdiction Unit"],
      ],
      { 1: "L. Rodriguez" },
    ),
  }),
  make({
    slug: "public-affairs",
    name: "Office of Public Affairs",
    callsign: "",
    prefix: "PA",
    branch: "Administrative Operations",
    command: { commander: "X-301", assistant: "X-302" },
    slots: slots("PA", [
      [1, "Director", "Director of Public Affairs Operations"],
      [1, "Deputy Director", "Deputy Director of Public Affairs Operations"],
      [3, "Media Specialist", "Multimedia & Press Content Creator"],
    ]),
  }),
  make({
    slug: "internal-affairs",
    name: "Internal Affairs Division",
    callsign: "",
    prefix: "IA",
    branch: "Administrative Operations",
    command: { commander: "X-303", assistant: "X-304" },
    slots: slots("IA", [
      [1, "Director", "Director of Internal Affairs Operations"],
      [1, "Deputy Director", "Deputy Director of Internal Affairs Operations"],
      [4, "Investigator", "Internal Affairs Investigator"],
    ]),
  }),
  make({
    slug: "strategic-operations",
    name: "Strategic Operations Division",
    callsign: "Delta",
    prefix: "D",
    branch: null,
    command: { commander: "X-311", assistant: "X-312" },
    slots: slots("D", [
      [1, "Division Commander", "Strategic Operations Division"],
      [1, "Division Assistant Commander", "Strategic Operations Division"],
      [8, "Operator", "Strategic Operations Division"],
    ]),
  }),
  make({
    slug: "swat",
    name: "SWAT",
    callsign: "Adam",
    prefix: "A",
    branch: null,
    command: { commander: "X-307", assistant: "X-308" },
    slots: slots(
      "A",
      [
        [1, "Division Commander", "SWAT Commander"],
        [1, "Division Assistant Commander", "SWAT Assistant Commander"],
        [4, "Sergeant", "Team Leader"],
        [5, "Operator", "SWAT Operator, Team 1"],
        [5, "Operator", "SWAT Operator, Team 2"],
        [3, "Marksman", "SWAT Marksman, Team 3"],
        [3, "Negotiator", "SWAT Crisis Negotiator, Team 4"],
      ],
      { 1: "M. Hathaway" },
    ),
  }),
];

export function divisionStaffing(d: Division) {
  const filled = d.slots.filter((s) => s.holder).length;
  return { filled, capacity: d.slots.length, vacancies: d.slots.length - filled };
}

export function divisionBySlug(slug: string) {
  return DIVISIONS.find((d) => d.slug === slug);
}
