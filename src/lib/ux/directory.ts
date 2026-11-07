import { RANKS } from "@/lib/authz";
import type { Member } from "@/lib/sample-data";

export interface DirectoryFilter {
  q: string;
  rank: string;
  district: string;
  division: string;
}
export const NO_FILTER: DirectoryFilter = { q: "", rank: "", district: "", division: "" };
export const isFiltered = (f: DirectoryFilter) => !!(f.q.trim() || f.rank || f.district || f.division);

/** Filters the already-authorized directory. It only narrows rows the caller received; it never reaches for more data. */
export function filterDirectory(members: Member[], f: DirectoryFilter): Member[] {
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return members.filter((m) => {
    if (f.rank && m.rank !== f.rank) return false;
    if (f.district && m.district !== f.district) return false;
    if (f.division && !m.divisions.includes(f.division)) return false;
    if (!terms.length) return true;
    const hay = `${m.name} ${m.callsign} ${m.rank} ${m.appointment} ${m.divisions.join(" ")}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/** Filter options built from the data actually present, so no option leads to an empty list by construction. */
export function facets(members: Member[]) {
  const ranks = RANKS.filter((r) => members.some((m) => m.rank === r));
  const districts = [...new Set(members.map((m) => m.district))].sort();
  const divisions = [...new Set(members.flatMap((m) => m.divisions))].sort();
  return { ranks, districts, divisions };
}
