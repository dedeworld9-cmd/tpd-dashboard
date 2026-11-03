import Link from "next/link";
import { ArrowUpRight, Car, ClipboardList, ExternalLink, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/hq/page-header";
import { HourMeter, formatMinutes } from "@/components/hq/hour-meter";
import { Badge, Panel, PanelHeader, StatusDot } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ME, MEMBERS, MY_SESSIONS, REQUESTS, VEHICLES, vehicleAuthorized } from "@/lib/sample-data";
import { stateTone } from "@/lib/request-tone";

export const metadata = { title: "Overview" };

export default function OverviewPage() {
  const remaining = Math.max(0, 180 - ME.weekMinutes);
  const mine = REQUESTS.filter((r) => r.member === ME.name);
  const onDuty = MEMBERS.filter((m) => m.onDuty);
  const supervisorsOnDuty = onDuty.filter((m) => ["Sergeant", "Lieutenant", "Captain", "Major"].includes(m.rank));

  return (
    <>
      <PageHeader title={`Welcome back, ${ME.name}`} description={`${ME.callsign} · ${ME.rank} · ${ME.district} District`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Duty card: the one-click patrol entry point. */}
          <Panel aria-labelledby="duty-title" className="overflow-hidden">
            <div className="flex flex-col gap-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="duty-title" className="text-sm font-semibold text-ink">
                    This week
                  </h2>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular">
                    {formatMinutes(ME.weekMinutes)}
                    <span className="ml-2 text-base font-normal text-muted">of 3h</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {remaining > 0 ? `${formatMinutes(remaining)} left before the week resets Monday` : "Weekly requirement met"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href="/hq/patrol" size="lg">
                    Start patrol
                  </ButtonLink>
                </div>
              </div>
              <HourMeter minutes={ME.weekMinutes} size="lg" />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-sunken/60 px-5 py-3 text-xs text-muted sm:px-6">
              <span>Week runs Monday to Sunday, Tampa time (pending leadership confirmation)</span>
              <Link href="/hq/activity" className="ml-auto font-semibold text-blue hover:underline">
                View activity
              </Link>
            </div>
          </Panel>

          <Panel aria-labelledby="recent-title">
            <PanelHeader id="recent-title" title="Recent patrols" action={<Link href="/hq/activity" className="text-xs font-semibold text-blue hover:underline">All sessions</Link>} />
            <ul className="divide-y divide-line">
              {MY_SESSIONS.slice(0, 3).map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{s.date}</p>
                    <p className="text-xs text-muted tabular">
                      {s.district} District · {s.start}–{s.end}
                    </p>
                  </div>
                  {s.flag ? <Badge tone="amber">{s.flag}</Badge> : null}
                  <span className="w-16 text-right text-sm font-semibold text-ink tabular">{formatMinutes(s.minutes)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel aria-labelledby="req-title">
            <PanelHeader id="req-title" title="Your requests" action={<ButtonLink href="/hq/requests" variant="secondary" size="sm">New request</ButtonLink>} />
            <ul className="divide-y divide-line">
              {mine.map((r) => (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <ClipboardList aria-hidden className="size-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{r.type}</p>
                    <p className="truncate text-xs text-muted">{r.summary}</p>
                  </div>
                  <Badge tone={stateTone(r.state)}>{r.state}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel aria-labelledby="dept-title">
            <PanelHeader id="dept-title" title="On duty now" description={`${onDuty.length} members on patrol`} />
            <div className="flex flex-col gap-3 px-5 py-4">
              <StatusDot tone={supervisorsOnDuty.length ? "green" : "amber"} label={supervisorsOnDuty.length ? `${supervisorsOnDuty.length} supervisors on duty` : "No supervisor on duty"} />
              <p className="text-xs text-muted">
                Pursuits require authorization from an on-duty Sergeant or above (Handbook §7).
              </p>
            </div>
          </Panel>

          <Panel aria-labelledby="quick-title">
            <PanelHeader id="quick-title" title="Quick links" />
            <ul className="p-2">
              <li>
                <span className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted" title="The AnchorCAD link has not been configured yet">
                  <ExternalLink aria-hidden className="size-4" />
                  AnchorCAD
                  <Badge className="ml-auto">Link not set</Badge>
                </span>
              </li>
              <li>
                <Link href="/hq/training" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink hover:bg-sunken">
                  <GraduationCap aria-hidden className="size-4 text-muted" />
                  Training and qualifications
                  <ArrowUpRight aria-hidden className="ml-auto size-4 text-muted" />
                </Link>
              </li>
              <li>
                <Link href="/hq/resources" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ink hover:bg-sunken">
                  <ClipboardList aria-hidden className="size-4 text-muted" />
                  Policies and handbook
                  <ArrowUpRight aria-hidden className="ml-auto size-4 text-muted" />
                </Link>
              </li>
            </ul>
          </Panel>

          <Panel aria-labelledby="fleet-title">
            <PanelHeader id="fleet-title" title="Your vehicles" description={`Authorized for ${ME.rank}`} />
            <ul className="divide-y divide-line">
              {VEHICLES.map((v) => {
                const ok = vehicleAuthorized(ME.rank, v.minRank);
                return (
                  <li key={v.name} className="flex items-center gap-3 px-5 py-3">
                    <Car aria-hidden className={ok ? "size-4 text-blue" : "size-4 text-muted"} />
                    <div className="min-w-0 flex-1">
                      <p className={ok ? "text-sm font-medium text-ink" : "text-sm text-muted"}>{v.name}</p>
                      <p className="text-2xs text-muted">{v.minRank} and above</p>
                    </div>
                    {ok ? <Badge tone="green">Authorized</Badge> : <Badge>Not yet</Badge>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
