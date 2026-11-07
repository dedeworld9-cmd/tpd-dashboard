"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, ExternalLink, Gauge, Users } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { ANCHORCAD_URL } from "@/components/shell/nav-config";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/status";
import { Card, CardHeader, DataList } from "@/components/ui/surface";
import { useAuth, useVerifiedMember } from "@/lib/backend/auth";
import { summary } from "@/lib/backend/membership";
import { ANNOUNCEMENTS } from "@/lib/announcements";
import { allMembers } from "@/lib/preview/store";
import { HANDBOOK_URL, USE_OF_FORCE_URL } from "@/lib/public-nav";
import { agoLabel, nextAction, overviewGroup, type OverviewGroup } from "@/lib/ux/overview";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const GROUP_LABEL: Record<OverviewGroup, string> = { new: "New member", member: "Member", supervisor: "Supervisory access", command: "Command access" };

/** Workspaces that have no server-side record yet. Listed as unavailable, never as zero. */
const UNAVAILABLE = ["Patrol and activity hours", "Training and qualifications", "Requests and decisions"];

/**
 * Overview for a verified member. Everything shown comes from the roster record or the directory the member's own session
 * may read. Emphasis follows the member's capabilities; the database, not this page, enforces what they can do.
 */
export function LiveOverview() {
  const me = useVerifiedMember();
  const { membership } = useAuth();
  if (!me) return null;

  const group = overviewGroup(me);
  const action = nextAction(me, HANDBOOK_URL);
  const s = summary(me);
  const roster = allMembers();
  const inDistrict = me.district ? roster.filter((m) => m.district === me.district).length : null;
  const myDivisions = s.divisions.map((d) => ({ ...d, count: roster.filter((m) => m.divisions.includes(d.name)).length }));

  const record = [
    { label: "Rank", value: me.rank },
    { label: "Call sign", value: me.callsign ?? "None assigned" },
    { label: "District", value: me.district ?? "Department-wide" },
    { label: "Appointment", value: me.appointment || "Not listed" },
    { label: "Divisions", value: s.divisions.length ? s.divisions.map((d) => `${d.name} (${d.callsign})`).join(", ") : "None" },
    { label: "Access", value: s.capabilities.length ? s.capabilities.join(" · ") : "Member access" },
  ];

  const links = [
    { href: HANDBOOK_URL, label: "Personnel Handbook", external: true },
    { href: USE_OF_FORCE_URL, label: "Use of Force Policy", external: true },
    { href: "/hq/resources", label: "Fleet and resources" },
    { href: "/hq/structure", label: "Department structure" },
    ...(ANCHORCAD_URL ? [{ href: ANCHORCAD_URL, label: "AnchorCAD", external: true }] : []),
  ];

  return (
    <Page>
      <PageHeader
        eyebrow={new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        title={`${greeting()}, ${me.name}`}
        description={`${me.rank}${me.callsign ? ` · ${me.callsign}` : ""}`}
        meta={
          <>
            <Pill tone="green">Verified roster member</Pill>
            <Pill tone="neutral">{GROUP_LABEL[group]}</Pill>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section aria-labelledby="next-action" className="rounded-xl border border-dark-line bg-obsidian p-5 text-on-dark shadow-sm">
            <p className="text-2xs font-semibold text-gold">Suggested next step</p>
            <h2 id="next-action" className="display mt-1 text-xl font-bold">
              {action.title}
            </h2>
            <p className="mt-1 max-w-md text-sm text-on-dark/70">{action.body}</p>
            <ButtonLink href={action.href} variant="gold" className="mt-4" {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {action.cta}
              {action.external ? <ExternalLink className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
            </ButtonLink>
          </section>

          <Card>
            <CardHeader title="Your record" description="From the official roster" />
            <div className="border-t border-line px-4 py-3">
              <DataList items={record} columns={2} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Your team" description="Active members you can see in the directory" />
            <ul className="divide-y divide-line border-t border-line text-xs">
              <li className="flex items-center justify-between px-4 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <Users className="size-3.5 text-muted" aria-hidden /> Department
                </span>
                <span className="tabular">{roster.length} active</span>
              </li>
              {inDistrict !== null ? (
                <li className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-medium">{me.district} District</span>
                  <span className="tabular">{inDistrict} active</span>
                </li>
              ) : null}
              {myDivisions.map((d) => (
                <li key={d.division} className="flex items-center justify-between px-4 py-2.5">
                  <Link href={`/hq/divisions/${d.division}`} className="font-medium hover:underline">
                    {d.name}
                  </Link>
                  <span className="tabular">{d.count} active</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5 text-2xs">
              <Link href="/hq/roster" className="font-semibold text-gold-ink hover:underline">
                Open personnel directory
              </Link>
            </div>
          </Card>

          {group === "command" ? (
            <Card>
              <CardHeader title="Command" description="Roster-derived staffing and integration health" />
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                <ButtonLink href="/hq/command" variant="secondary">
                  <Gauge className="size-3.5" aria-hidden /> Command Center
                </ButtonLink>
                <ButtonLink href="/hq/command/integrations" variant="secondary">
                  Integrations
                </ButtonLink>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Announcements" />
            <ul className="divide-y divide-line border-t border-line">
              {ANNOUNCEMENTS.map((a) => (
                <li key={a.title} className="px-4 py-3">
                  <p className="text-3xs text-muted">{a.date}</p>
                  <p className="text-xs font-semibold">{a.title}</p>
                  <p className="mt-0.5 text-2xs text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Resources" />
            <ul className="divide-y divide-line border-t border-line text-xs">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex items-center justify-between px-4 py-2.5 font-medium hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-muted" aria-hidden /> {l.label}
                    </span>
                    {l.external ? <ExternalLink className="size-3 text-muted" aria-label="Opens in a new tab" /> : <span aria-hidden className="text-muted">→</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Not connected yet" description="No figures are shown until these have a server-side record" />
            <ul className="divide-y divide-line border-t border-line text-xs text-muted">
              {UNAVAILABLE.map((u) => (
                <li key={u} className="px-4 py-2.5">
                  {u}
                </li>
              ))}
            </ul>
          </Card>

          <p className="px-1 text-3xs text-muted">Roster last synced {agoLabel(membership?.last_sync_at)}.</p>
        </div>
      </div>
    </Page>
  );
}
