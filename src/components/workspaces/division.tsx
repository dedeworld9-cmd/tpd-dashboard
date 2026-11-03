"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { CapacityBar } from "@/components/ui/data-viz";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Avatar, RankMark } from "@/components/ui/identity";
import { Pill } from "@/components/ui/status";
import { Card, CardHeader } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/preview/hooks";
import { allMembers, usePreviewState } from "@/lib/preview/store";
import { DIVISIONS, RANKS } from "@/lib/sample-data";

export function DivisionWorkspace({ slug }: { slug: string }) {
  const me = useMe();
  const state = usePreviewState();
  const { openNewRequest } = useShell();
  const division = DIVISIONS.find((d) => d.slug === slug)!;
  if (!me || !state) {
    return (
      <Page>
        <Skeleton className="mb-6 h-8 w-64" />
        <Skeleton className="h-80 rounded-lg" />
      </Page>
    );
  }
  const roster = allMembers()
    .filter((m) => m.divisions.includes(division.name))
    .sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
  const member = me.member.divisions.includes(division.name);
  const atLimit = me.member.divisions.length >= 3;
  const full = roster.length >= division.capacity;
  const pending = state.requests.some((r) => r.memberId === me.member.id && r.type === "Division application" && (r.state === "Submitted" || r.state === "Under review") && r.summary.includes(division.name));
  const blocked = member ? "You’re a member" : pending ? "Application pending" : atLimit ? "You hold 3 subdivisions (Handbook §9.3)" : full ? "No vacancies" : null;

  return (
    <Page wide>
      <PageHeader
        eyebrow="Division"
        title={division.name}
        description={division.callsign ? `Radio call sign “${division.callsign}” · prefix ${division.prefix}` : `Call sign prefix ${division.prefix}`}
        meta={
          <>
            <Pill tone="neutral">
              {roster.length} of {division.capacity} positions filled
            </Pill>
            {member ? <Pill tone="gold">Your division</Pill> : null}
          </>
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button disabled={!!blocked} onClick={() => openNewRequest("Division application")}>
              Apply to join
            </Button>
            {blocked ? <span className="text-3xs text-muted">{blocked}</span> : null}
          </div>
        }
      />

      <nav aria-label="Divisions" className="scrollbar-thin mb-5 overflow-x-auto">
        <ul className="flex gap-1.5">
          {DIVISIONS.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/hq/divisions/${d.slug}`}
                aria-current={d.slug === slug ? "page" : undefined}
                className={cn("block rounded-full px-3 py-1.5 text-2xs font-medium whitespace-nowrap ring-1 ring-inset", d.slug === slug ? "bg-obsidian text-gold ring-obsidian" : "bg-surface text-ink-2 ring-line-strong hover:ring-ink/30")}
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Division roster" description={`${division.capacity - roster.length} vacancies`} />
          {roster.length ? (
            <ul className="divide-y divide-line border-t border-line">
              {roster.map((m) => (
                <li key={m.id}>
                  <Link href={`/hq/roster?member=${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <Avatar name={m.name} size={32} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-xs font-semibold">{m.name}</span>
                      <span className="block truncate text-3xs text-muted">
                        <RankMark rank={m.rank} /> · {m.callsign}
                      </span>
                    </span>
                    <span className="text-3xs text-muted">{m.appointment}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Building2 />} title="No members yet" body="Approved applicants appear here." />
          )}
        </Card>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Staffing" />
            <div className="border-t border-line px-4 py-4">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-ink-2">Filled</span>
                <span className="font-semibold tabular">
                  {roster.length} / {division.capacity}
                </span>
              </div>
              <CapacityBar filled={roster.length} total={division.capacity} label="Division staffing" tone="gold" />
            </div>
          </Card>
          <Card>
            <CardHeader title="Assignment rules" description="Handbook §9.3 and §3.2" />
            <ul className="flex flex-col gap-2 border-t border-line px-4 py-3.5 text-2xs text-ink-2">
              <li>Members may hold up to three subdivisions at once, at any rank.</li>
              <li>Divisions don’t set their own activity quotas; the department-wide 3 hours applies.</li>
              <li className="text-muted">Branch: {division.branch === "Unassigned" ? "awaiting leadership confirmation (PC-07)" : division.branch}</li>
            </ul>
          </Card>
        </div>
      </div>
    </Page>
  );
}

export function DivisionsOverview() {
  const state = usePreviewState();
  const me = useMe();
  const members = state ? allMembers() : [];
  return (
    <Page wide>
      <PageHeader eyebrow="Department" title="Divisions" description="Specialized assignments alongside patrol. Members may hold up to three at any rank (Handbook §9.3)." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DIVISIONS.map((d) => {
          const filled = members.filter((m) => m.divisions.includes(d.name)).length;
          const mine = !!me?.member.divisions.includes(d.name);
          return (
            <li key={d.slug}>
              <Link href={`/hq/divisions/${d.slug}`} className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-strong">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{d.name}</p>
                  <span className="shrink-0 rounded-full bg-obsidian px-2.5 py-0.5 text-3xs font-bold text-gold">{d.callsign ? `${d.callsign} · ${d.prefix}` : d.prefix}</span>
                </div>
                {mine ? <Pill tone="gold" className="mt-2 self-start">Your division</Pill> : null}
                <div className="mt-auto pt-6">
                  <div className="mb-1.5 flex justify-between text-3xs text-muted">
                    <span>Staffing</span>
                    <span className="tabular">{state ? `${filled} / ${d.capacity}` : `— / ${d.capacity}`}</span>
                  </div>
                  <CapacityBar filled={filled} total={d.capacity} label={`${d.name} staffing`} tone="gold" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
