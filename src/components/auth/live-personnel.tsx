"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Users, X } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/feedback";
import { SearchField, Select } from "@/components/ui/field";
import { Avatar, RankMark } from "@/components/ui/identity";
import { Sheet } from "@/components/ui/overlay";
import { Pill } from "@/components/ui/status";
import { Card, DataList } from "@/components/ui/surface";
import { RANKS } from "@/lib/authz";
import { allMembers } from "@/lib/preview/store";
import type { Member } from "@/lib/sample-data";
import { OPEN_MEMBER_EVENT, takePendingMember } from "@/lib/ux/pending-member";
import { facets, filterDirectory, isFiltered, NO_FILTER, type DirectoryFilter } from "@/lib/ux/directory";

const CARD_PAGE = 20;

/**
 * Verified directory. Fields are exactly what the directory view returns to this member's session
 * (name, call sign, rank, appointment, district, divisions): no Discord IDs, timezones or points.
 * Filtering only narrows rows already received; selection is local state, so no member id ever reaches a URL.
 */
export function LivePersonnel() {
  const [f, setF] = useState<DirectoryFilter>(NO_FILTER);
  const [open, setOpen] = useState<Member | null>(null);
  const [shown, setShown] = useState(CARD_PAGE);
  const all = allMembers();
  const opts = useMemo(() => facets(all), [all]);
  const rows = useMemo(() => filterDirectory(all, f), [all, f]);
  const set = (patch: Partial<DirectoryFilter>) => {
    setF((cur) => ({ ...cur, ...patch }));
    setShown(CARD_PAGE);
  };
  const live = useRef<HTMLParagraphElement>(null);

  // The command palette asks for a member's panel through memory, not the URL.
  useEffect(() => {
    const take = () => {
      const id = takePendingMember();
      const m = id ? allMembers().find((x) => x.id === id) : null;
      if (m) setOpen(m);
    };
    take();
    window.addEventListener(OPEN_MEMBER_EVENT, take);
    return () => window.removeEventListener(OPEN_MEMBER_EVENT, take);
  }, []);

  const columns: Column<Member>[] = [
    {
      key: "member",
      header: "Member",
      sort: (m) => m.name,
      text: (m) => m.name,
      cell: (m) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={m.name} size={28} />
          <span className="font-medium">{m.name}</span>
        </span>
      ),
    },
    { key: "callsign", header: "Call sign", hideable: true, sort: (m) => m.callsign, cell: (m) => <span className="tabular">{m.callsign}</span> },
    { key: "rank", header: "Rank", hideable: true, sort: (m) => RANKS.indexOf(m.rank), text: (m) => m.rank, cell: (m) => <RankMark rank={m.rank} /> },
    { key: "appointment", header: "Appointment", hideable: true, sort: (m) => m.appointment, cell: (m) => m.appointment || "—" },
    { key: "district", header: "District", hideable: true, sort: (m) => m.district, cell: (m) => m.district },
    { key: "divisions", header: "Divisions", hideable: true, text: (m) => m.divisions.join("; "), cell: (m) => (m.divisions.length ? m.divisions.join(", ") : "—") },
  ];

  const sortedForCards = useMemo(() => [...rows].sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.localeCompare(b.name)), [rows]);
  const filtered = isFiltered(f);
  const count = `${rows.length} of ${all.length} members${filtered ? " match" : ""}`;

  const controls = (
    <>
      <SearchField label="Search personnel" placeholder="Name, call sign, appointment" value={f.q} onChange={(e) => set({ q: e.target.value })} className="w-full sm:w-64" />
      <Select aria-label="Rank" value={f.rank} onChange={(e) => set({ rank: e.target.value })} className="[&_select]:h-8 [&_select]:text-xs">
        <option value="">Rank: any</option>
        {opts.ranks.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </Select>
      <Select aria-label="District" value={f.district} onChange={(e) => set({ district: e.target.value })} className="[&_select]:h-8 [&_select]:text-xs">
        <option value="">District: any</option>
        {opts.districts.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </Select>
      {opts.divisions.length ? (
        <Select aria-label="Division" value={f.division} onChange={(e) => set({ division: e.target.value })} className="[&_select]:h-8 [&_select]:text-xs">
          <option value="">Division: any</option>
          {opts.divisions.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </Select>
      ) : null}
      {filtered ? (
        <Button size="sm" variant="ghost" icon={<X />} onClick={() => set(NO_FILTER)}>
          Clear
        </Button>
      ) : null}
    </>
  );

  return (
    <Page wide>
      <PageHeader
        eyebrow="Department"
        title="Personnel"
        description="Active members from the official roster, as last synced. Every position, including vacancies, is on Department structure."
        meta={<Pill tone="green">Verified roster · {all.length} active</Pill>}
      />

      {/* Phones and small tablets: cards, with the same filters. */}
      <div className="md:hidden">
        <div className="mb-3 flex flex-wrap items-center gap-2">{controls}</div>
        <p ref={live} role="status" className="mb-2 text-2xs text-muted">
          {count}
        </p>
        {sortedForCards.length === 0 ? (
          <Card>
            <EmptyState icon={<Users />} title="No members match" body="Clear a filter to see more of the roster." action={<Button size="sm" variant="secondary" onClick={() => set(NO_FILTER)}>Clear filters</Button>} />
          </Card>
        ) : (
          <ul className="space-y-2">
            {sortedForCards.slice(0, shown).map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setOpen(m)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left shadow-sm active:bg-surface-2"
                >
                  <Avatar name={m.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.name}</span>
                    <span className="block truncate text-2xs text-muted">
                      {m.rank}
                      {m.callsign !== "—" ? ` · ${m.callsign}` : ""} · {m.district}
                    </span>
                    {m.divisions.length ? <span className="block truncate text-3xs text-muted">{m.divisions.join(", ")}</span> : null}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="sr-only">Details for {m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {shown < sortedForCards.length ? (
          <Button variant="secondary" className="mt-3 w-full" onClick={() => setShown((n) => n + CARD_PAGE)}>
            Show more ({sortedForCards.length - shown} left)
          </Button>
        ) : null}
      </div>

      {/* Tablets and desktops: the sortable table. */}
      <Card className="hidden md:block">
        <DataTable
          label="Personnel"
          rows={rows}
          columns={columns}
          rowKey={(m) => m.id}
          initialSort={{ key: "rank", dir: "asc" }}
          storageKey="tpd-live-personnel-cols"
          pageSize={15}
          onRowClick={setOpen}
          activeKey={open?.id ?? null}
          empty={<EmptyState icon={<Users />} title="No members match" body="Clear a filter to see more of the roster." action={<Button size="sm" variant="secondary" onClick={() => set(NO_FILTER)}>Clear filters</Button>} />}
          toolbar={
            <>
              {controls}
              <span role="status" className="ml-auto text-2xs text-muted tabular">
                {count}
              </span>
            </>
          }
        />
      </Card>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} subtitle={open ? `${open.rank}${open.callsign !== "—" ? ` · ${open.callsign}` : ""}` : null}>
        {open ? (
          <div className="px-5 py-4">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={open.name} size={48} />
              <div className="min-w-0">
                <RankMark rank={open.rank} />
                <p className="text-2xs text-muted">{open.status}</p>
              </div>
            </div>
            <DataList
              columns={2}
              items={[
                { label: "Call sign", value: open.callsign },
                { label: "District", value: open.district },
                { label: "Appointment", value: open.appointment || "Not listed" },
                { label: "Divisions", value: open.divisions.length ? open.divisions.join(", ") : "None" },
              ]}
            />
            <p className="mt-5 text-3xs text-muted">Roster details only. Patrol, training and request history are not connected yet.</p>
          </div>
        ) : null}
      </Sheet>
    </Page>
  );
}
