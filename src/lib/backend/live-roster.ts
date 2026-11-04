import { RANKS, type Rank } from "@/lib/authz";
import { DIVISIONS } from "@/lib/department";
import type { LiveRoster } from "@/lib/preview/store";
import type { Member } from "@/lib/sample-data";
import type { VerifiedMember } from "./membership";

/** Row shape of tpd.personnel_directory: no Discord IDs, no timezones. */
export interface DirectoryRow {
  id: string;
  name: string;
  callsign: string | null;
  rank: string;
  appointment: string | null;
  tier: string;
  district: string | null;
  status: string;
}
export interface SlotRow {
  personnel_id: string | null;
  division_slug: string;
}

const isRank = (r: string): r is Rank => (RANKS as readonly string[]).includes(r);

function toMember(row: DirectoryRow, divisions: string[], timezone: string): Member | null {
  // An unknown rank is a data problem, never a reason to guess: the row is left out.
  if (!isRank(row.rank) || row.status !== "active") return null;
  return {
    id: row.id,
    name: row.name,
    callsign: row.callsign ?? "—",
    rank: row.rank,
    district: row.district === "North" || row.district === "South" ? row.district : "Department",
    appointment: row.appointment ?? "",
    divisions,
    status: row.rank === "Probationary Officer" ? "Probationary" : "Active",
    // Patrol time is not recorded server-side yet, so no figures are invented.
    weekMinutes: 0,
    onDuty: false,
    timezone,
  };
}

/** Builds the live roster from the directory and division-slot rows the caller's RLS allowed. Pure, so it is testable. */
export function buildLiveRoster(me: VerifiedMember, directory: DirectoryRow[], slots: SlotRow[]): LiveRoster {
  const byPerson = new Map<string, string[]>();
  for (const s of slots) {
    if (!s.personnel_id) continue;
    const name = DIVISIONS.find((d) => d.slug === s.division_slug)?.name ?? s.division_slug;
    byPerson.set(s.personnel_id, [...(byPerson.get(s.personnel_id) ?? []), name]);
  }
  const members = directory.flatMap((r) => {
    const m = toMember(r, [...new Set(byPerson.get(r.id) ?? [])], "—");
    return m ? [m] : [];
  });
  // The signed-in member comes from my_membership (their own record), which also carries their timezone.
  const mine: Member = {
    id: me.id,
    name: me.name,
    callsign: me.callsign ?? "—",
    rank: me.rank,
    district: me.district ?? "Department",
    appointment: me.appointment,
    divisions: [...new Set(me.divisions.map((d) => DIVISIONS.find((x) => x.slug === d.division)?.name ?? d.division))],
    status: me.rank === "Probationary Officer" ? "Probationary" : "Active",
    weekMinutes: 0,
    onDuty: false,
    timezone: me.timezone ?? "—",
  };
  return { me: mine, members: [mine, ...members.filter((m) => m.id !== me.id)] };
}

interface Sb {
  from(table: string): { select(cols: string): PromiseLike<{ data: unknown[] | null; error: unknown }> };
}

/** Reads the directory with the member's own session; RLS decides what comes back. Throws on any failure: there is no demo fallback. */
export async function loadLiveRoster(sb: Sb, me: VerifiedMember): Promise<LiveRoster> {
  const [dir, slots] = await Promise.all([
    sb.from("personnel_directory").select("id,name,callsign,rank,appointment,tier,district,status"),
    sb.from("division_slots").select("personnel_id,division_slug"),
  ]);
  if (dir.error || slots.error || !dir.data || !slots.data) throw new Error("The roster directory could not be loaded.");
  return buildLiveRoster(me, dir.data as DirectoryRow[], slots.data as SlotRow[]);
}
