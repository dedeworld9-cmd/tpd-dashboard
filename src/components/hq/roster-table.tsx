"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Avatar, Badge, EmptyState, type Tone } from "@/components/ui/primitives";
import { RANKS, type Member, type Status } from "@/lib/sample-data";
import { cn } from "@/lib/cn";

const statusTone: Record<Status, Tone> = {
  Active: "green",
  "On leave": "gold",
  Probationary: "blue",
  Suspended: "red",
};

const selectClass =
  "h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-ink hover:border-line-strong";

export function RosterTable({ members, initialQuery }: { members: Member[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [district, setDistrict] = useState("All");
  const [rank, setRank] = useState("All");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => (district === "All" ? true : m.district === district))
      .filter((m) => (rank === "All" ? true : m.rank === rank))
      .filter((m) => (status === "All" ? true : m.status === status))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.callsign.toLowerCase().includes(q) || m.appointment.toLowerCase().includes(q))
      .sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.callsign.localeCompare(b.callsign));
  }, [members, query, district, rank, status]);

  const filtered = query || district !== "All" || rank !== "All" || status !== "All";

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search personnel</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, call sign or appointment"
            className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted hover:border-line-strong"
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:flex">
          <select aria-label="District" value={district} onChange={(e) => setDistrict(e.target.value)} className={selectClass}>
            <option value="All">All districts</option>
            <option>North</option>
            <option>South</option>
            <option>Department</option>
          </select>
          <select aria-label="Rank" value={rank} onChange={(e) => setRank(e.target.value)} className={selectClass}>
            <option value="All">All ranks</option>
            {RANKS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="All">All statuses</option>
            {Object.keys(statusTone).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="px-4 pt-3 text-xs text-muted" aria-live="polite">
        {rows.length} of {members.length} members
        {filtered ? (
          <button
            type="button"
            className="ml-2 font-semibold text-blue hover:underline"
            onClick={() => {
              setQuery("");
              setDistrict("All");
              setRank("All");
              setStatus("All");
            }}
          >
            Clear filters
          </button>
        ) : null}
      </p>

      {rows.length === 0 ? (
        <EmptyState title="No members match these filters" body="Try a different call sign or clear the filters to see the full roster." />
      ) : (
        <>
          {/* Table for tablet and up */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-2xs font-medium text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">Member</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Rank</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">District</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Divisions</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-sunken/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-ink">
                            <span className="tabular text-muted">{m.callsign}</span> {m.name}
                          </p>
                          <p className="truncate text-xs text-muted">{m.appointment}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cn("px-4 py-3", RANKS.indexOf(m.rank) <= 5 ? "font-medium text-gold" : "text-ink-2")}>{m.rank}</td>
                    <td className="px-4 py-3 text-ink-2">{m.district}</td>
                    <td className="px-4 py-3 text-ink-2">{m.divisions.length ? m.divisions.join(", ") : <span className="text-muted">None</span>}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[m.status]}>{m.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* List for phones */}
          <ul className="divide-y divide-line border-t border-line md:hidden">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    <span className="tabular text-muted">{m.callsign}</span> {m.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {m.rank} · {m.district}
                  </p>
                </div>
                <Badge tone={statusTone[m.status]}>{m.status}</Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
