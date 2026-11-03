"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Car, ClipboardList, ExternalLink, GraduationCap, Lock, Radio, ShieldCheck, Square } from "lucide-react";
import { usePatrol } from "@/components/patrol/patrol-provider";
import { useShell } from "@/components/shell/shell-context";
import { Page } from "@/components/shell/page";
import { ANCHORCAD_URL } from "@/components/shell/nav-config";
import { Button, ButtonLink } from "@/components/ui/button";
import { BarChart, HourMeter, Legend, StackBar } from "@/components/ui/data-viz";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Avatar, RankMark } from "@/components/ui/identity";
import { Card, CardHeader } from "@/components/ui/surface";
import { Dot, Pill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { can, canDecide } from "@/lib/authz";
import { cn } from "@/lib/cn";
import { formatClock, formatMinutes, REQUIRED_MINUTES, weekEnd, formatTime } from "@/lib/domain/activity";
import { exemptReason, memberDaily, memberWeek, openRequests, roster } from "@/lib/preview/derived";
import { useMe, useNow } from "@/lib/preview/hooks";
import { memberById, usePreviewState, type PatrolDistrict, type PreviewState } from "@/lib/preview/store";
import { stateTone } from "@/lib/request-tone";
import { TRAINING_MODULES, VEHICLES, vehicleAuthorized } from "@/lib/sample-data";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function greeting(now: number) {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/New_York" }).format(now));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const me = useMe();
  const state = usePreviewState();
  const now = useNow(30_000);

  if (!me || !state || !now) return <DashboardSkeleton />;

  const isSupervisor = can(me.actor, "supervisor.view");
  const isCommand = can(me.actor, "command.view");
  const probationary = !can(me.actor, "patrol.start");

  return (
    <Page wide>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-2xs font-semibold text-gold-ink">{new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="display mt-1 text-2xl font-bold tracking-tight">
            {greeting(now)}, {me.member.rank === "Probationary Officer" ? "Officer" : me.member.rank} {me.member.name.split(" ").pop()}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-2xs text-muted">
          <Pill tone="neutral">{me.member.callsign}</Pill>
          <Pill tone="neutral">{me.member.district === "Department" ? "Department" : `${me.member.district} District`}</Pill>
          {me.member.divisions.map((d) => (
            <Pill key={d} tone="gold">
              {d}
            </Pill>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          {probationary ? <TrainingHero /> : <DutyHero state={state} now={now} />}
          {isCommand ? <CommandSnapshot state={state} now={now} /> : isSupervisor ? <DistrictBoard state={state} now={now} district={me.member.district} /> : null}
          <div className="grid gap-5 lg:grid-cols-2">
            <WeekCard state={state} now={now} />
            <RecentSessions state={state} />
          </div>
        </div>

        <aside aria-label="Your work" className="flex min-w-0 flex-col gap-5">
          {isSupervisor ? <ReviewQueue state={state} /> : null}
          <MyRequests state={state} />
          <QuickLinks />
          <FleetCard />
        </aside>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- hero: duty

function DutyHero({ state, now }: { state: PreviewState; now: number }) {
  const me = useMe()!;
  const patrol = usePatrol();
  const tick = useNow(1000, !!me.session);
  const [district, setDistrict] = useState<PatrolDistrict>(me.member.district === "South" ? "South" : "North");
  const week = memberWeek(state, me.member.id, tick || now);
  const remaining = Math.max(0, REQUIRED_MINUTES - week);
  const onDuty = patrol.phase === "on-duty" || patrol.phase === "ending" || patrol.phase === "recovering";
  const resets = weekEnd(new Date(now)).toLocaleDateString("en-US", { weekday: "long", timeZone: "America/New_York" });

  return (
    <section aria-labelledby="duty-h" className="relative isolate overflow-hidden rounded-xl bg-obsidian text-on-dark shadow-md ring-1 ring-dark-line">
      <Image src="/brand/tampa-banner-1200.webp" alt="" fill sizes="(min-width:1280px) 900px, 100vw" className="-z-10 object-cover object-[60%_40%] opacity-25" priority />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--obsidian)_30%,color-mix(in_srgb,var(--obsidian)_70%,transparent)_65%,color-mix(in_srgb,var(--obsidian)_35%,transparent))]" />
      {onDuty ? <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gold" /> : null}

      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <h2 id="duty-h" className="flex items-center gap-2 text-2xs font-semibold text-on-dark-muted">
            <Dot tone={onDuty ? "gold" : "dark"} live={onDuty} />
            {patrol.phase === "recovering" ? "Reconnecting to your patrol…" : onDuty ? `On duty · ${me.session?.district} District` : "Off duty"}
          </h2>
          {onDuty && me.session ? (
            <p className="display-x mt-2 text-[44px] leading-none font-bold tracking-tight text-gold tabular sm:text-[56px]" aria-live="off">
              {formatClock(((tick || now) - me.session.start) / 1000)}
            </p>
          ) : (
            <p className="display mt-2 text-[40px] leading-none font-bold tracking-tight tabular sm:text-[48px]">
              {formatMinutes(week)}
              <span className="ml-2 text-base font-medium text-on-dark-muted">of 3h this week</span>
            </p>
          )}
          <p className="mt-2 text-xs text-on-dark-muted">
            {onDuty && me.session
              ? `Started ${formatTime(me.session.start)} · ${formatMinutes(week)} this week including this session`
              : remaining > 0
                ? `${formatMinutes(remaining)} to go before the week resets ${resets}.`
                : "Weekly requirement met. Thank you."}
          </p>
          <div className="mt-4 max-w-md">
            <HourMeter minutes={week} dark live={onDuty} size="lg" />
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2.5 md:items-end">
          {onDuty ? (
            <>
              <ButtonLink href="/hq/patrol" variant="gold" size="lg">
                <Radio className="size-4" aria-hidden /> Open patrol console
              </ButtonLink>
              <Button variant="dark" onClick={patrol.requestEnd} disabled={patrol.phase !== "on-duty"} icon={<Square className="size-3.5" />}>
                End patrol
              </Button>
            </>
          ) : (
            <>
              <Segmented
                dark
                size="sm"
                label="District"
                value={district}
                onChange={setDistrict}
                disabled={patrol.phase !== "idle"}
                options={[
                  { value: "North", label: "North" },
                  { value: "South", label: "South" },
                ]}
              />
              <Button variant="gold" size="lg" loading={patrol.phase === "starting"} disabled={patrol.phase !== "idle"} onClick={() => patrol.start(district)}>
                {patrol.phase === "starting" ? "Starting…" : `Start patrol · ${district}`}
              </Button>
            </>
          )}
          <p className="text-3xs text-on-dark-muted">Report incidents in AnchorCAD (Handbook §10)</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- hero: probationary

function TrainingHero() {
  const done = TRAINING_MODULES.filter((m) => m.state === "Complete").length;
  const next = TRAINING_MODULES.find((m) => m.state !== "Complete");
  return (
    <section aria-labelledby="train-h" className="relative isolate overflow-hidden rounded-xl bg-obsidian text-on-dark shadow-md ring-1 ring-dark-line">
      <Image src="/brand/tampa-banner-1200.webp" alt="" fill sizes="(min-width:1280px) 900px, 100vw" className="-z-10 object-cover opacity-20" priority />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--obsidian)_35%,transparent)]" />
      <div className="p-5 sm:p-6">
        <h2 id="train-h" className="flex items-center gap-2 text-2xs font-semibold text-on-dark-muted">
          <GraduationCap className="size-3.5 text-gold" aria-hidden /> Field training program
        </h2>
        <p className="display mt-2 text-[40px] leading-none font-bold tracking-tight tabular">
          {done}
          <span className="text-on-dark-muted">/{TRAINING_MODULES.length}</span>
          <span className="ml-2 text-base font-medium text-on-dark-muted">modules signed off</span>
        </p>
        <ol className="mt-4 grid grid-cols-6 gap-1.5" aria-label="Training modules">
          {TRAINING_MODULES.map((m) => (
            <li key={m.key} title={`${m.title}: ${m.state}`} className={cn("h-2 rounded-full", m.state === "Complete" ? "bg-gold" : m.state === "In progress" ? "bg-gold/40" : "bg-white/10")}>
              <span className="sr-only">
                {m.title}: {m.state}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {next ? (
            <ButtonLink href="/hq/training" variant="gold">
              Continue: {next.title} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-2xs text-on-dark-muted">
            <Lock className="size-3.5" aria-hidden /> Independent patrol unlocks after Office of the Chiefs approval (Handbook §3.1)
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- week

function WeekCard({ state, now }: { state: PreviewState; now: number }) {
  const me = useMe()!;
  const daily = memberDaily(state, me.member.id, now);
  const today = (new Date(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)).getDay() + 6) % 7;
  const exempt = exemptReason(me.member);
  return (
    <Card>
      <CardHeader
        title="This week by day"
        description={exempt ?? "Monday to Sunday, Tampa time (interim, pending leadership)"}
        action={
          <Link href="/hq/activity" className="text-2xs font-semibold text-gold-ink hover:underline">
            Activity
          </Link>
        }
      />
      <div className="px-4 pt-3 pb-4">
        <BarChart values={daily} labels={DAYS} highlight={today} height={110} label="Patrol minutes per day this week" />
      </div>
    </Card>
  );
}

function RecentSessions({ state }: { state: PreviewState }) {
  const me = useMe()!;
  const mine = state.sessions.filter((s) => s.memberId === me.member.id && s.end).sort((a, b) => b.start - a.start).slice(0, 4);
  return (
    <Card>
      <CardHeader
        title="Recent patrols"
        action={
          <Link href="/hq/patrol#history" className="text-2xs font-semibold text-gold-ink hover:underline">
            History
          </Link>
        }
      />
      {mine.length === 0 ? (
        <EmptyState icon={<Radio />} title="No patrols yet" body="Sessions you log appear here with their duration." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {mine.map((s) => {
            const d = new Date(s.start);
            const mins = Math.floor((s.end! - s.start) / 60000);
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-11 shrink-0 text-center leading-tight">
                  <p className="text-3xs font-semibold text-muted uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</p>
                  <p className="text-sm font-semibold tabular">{d.getDate()}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">
                    {s.district} District · <span className="tabular">{formatMinutes(mins)}</span>
                  </p>
                  <p className="text-3xs text-muted tabular">
                    {formatTime(s.start)}–{formatTime(s.end!)} · {s.id}
                  </p>
                </div>
                {s.flag ? <Pill tone={s.flag === "Needs review" ? "amber" : "info"}>{s.flag}</Pill> : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- right rail

function MyRequests({ state }: { state: PreviewState }) {
  const me = useMe()!;
  const { openNewRequest } = useShell();
  const mine = state.requests.filter((r) => r.memberId === me.member.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  return (
    <Card>
      <CardHeader
        title="My requests"
        action={
          <Button size="xs" variant="secondary" onClick={() => openNewRequest()}>
            New
          </Button>
        }
      />
      {mine.length === 0 ? (
        <p className="border-t border-line px-4 py-6 text-center text-2xs text-muted">No requests yet. Leave, transfers and division applications start here.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {mine.map((r) => (
            <li key={r.id}>
              <Link href={`/hq/requests?id=${r.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{r.type}</p>
                  <p className="truncate text-3xs text-muted">
                    {r.id} · {r.summary}
                  </p>
                </div>
                <Pill tone={stateTone(r.state)}>{r.state}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ReviewQueue({ state }: { state: PreviewState }) {
  const me = useMe()!;
  const isCommand = can(me.actor, "command.view");
  const queue = openRequests(state)
    .filter((r) => canDecide(me.actor, r.type, r.memberId === me.member.id))
    .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  const assigned = queue.filter((r) => r.reviewerId === me.member.id).length;
  return (
    <Card className="border-gold/40">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-gold-ink" aria-hidden /> Waiting on your decision
          </span>
        }
        description={`${queue.length} you can decide · ${assigned} assigned to you`}
        action={
          <Link href={isCommand ? "/hq/command" : "/hq/requests?view=review"} className="text-2xs font-semibold text-gold-ink hover:underline">
            Open queue
          </Link>
        }
      />
      {queue.length === 0 ? (
        <p className="border-t border-line px-4 py-6 text-center text-2xs text-muted">Nothing needs your decision.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {queue.slice(0, 4).map((r) => {
            const who = memberById(r.memberId)!;
            return (
              <li key={r.id}>
                <Link href={isCommand ? `/hq/command?id=${r.id}` : `/hq/requests?id=${r.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2">
                  <Avatar name={who.name} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {r.type} <span className="font-normal text-muted">· {who.name}</span>
                    </p>
                    <p className="truncate text-3xs text-muted">{r.summary}</p>
                  </div>
                  <ArrowUpRight className="size-3.5 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function QuickLinks() {
  const links = [
    { href: "/hq/training", label: "Training", icon: GraduationCap },
    { href: "/hq/requests", label: "Requests", icon: ClipboardList },
    { href: "/hq/resources", label: "Policies", icon: ShieldCheck },
  ];
  return (
    <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-2">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs font-medium shadow-sm transition-colors hover:border-line-strong">
          <l.icon className="size-4 text-gold-ink" aria-hidden /> {l.label}
        </Link>
      ))}
      {ANCHORCAD_URL ? (
        <a href={ANCHORCAD_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs font-medium shadow-sm hover:border-line-strong">
          <ExternalLink className="size-4 text-gold-ink" aria-hidden /> AnchorCAD
        </a>
      ) : (
        <span title="The AnchorCAD link has not been configured yet" className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2.5 text-xs font-medium text-muted">
          <ExternalLink className="size-4" aria-hidden /> AnchorCAD
        </span>
      )}
    </nav>
  );
}

function FleetCard() {
  const me = useMe()!;
  return (
    <Card className="overflow-hidden">
      <div className="relative h-28 bg-obsidian">
        <Image src="/brand/charger-960.webp" alt="TPD Charger patrol vehicle in game" fill sizes="360px" className="object-cover object-[50%_60%] opacity-90" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/80 to-transparent" />
        <p className="absolute bottom-2.5 left-4 flex items-center gap-1.5 text-2xs font-semibold text-on-dark">
          <Car className="size-3.5 text-gold" aria-hidden /> Your authorized fleet
        </p>
      </div>
      <ul className="divide-y divide-line">
        {VEHICLES.map((v) => {
          const ok = vehicleAuthorized(me.member.rank, v.minRank);
          return (
            <li key={v.name} className={cn("flex items-center gap-3 px-4 py-2", !ok && "opacity-55")}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{v.name}</p>
                <p className="truncate text-3xs text-muted">{v.model}</p>
              </div>
              {ok ? <Pill tone="green">Authorized</Pill> : <span className="text-3xs text-muted">{v.minRank}+</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- supervisor / command

export function DistrictBoard({ state, now, district }: { state: PreviewState; now: number; district: string }) {
  const rows = roster(state, now).filter((r) => district === "Department" || r.member.district === district);
  const onDuty = rows.filter((r) => r.onDuty);
  const me = useMe()!;
  const atRisk = rows.filter((r) => r.band === "at-risk" && r.member.id !== me.member.id);
  return (
    <Card>
      <CardHeader
        title={`${district} District right now`}
        description={`${onDuty.length} on duty · ${atRisk.length} below half of the weekly requirement`}
        action={
          <Link href="/hq/supervisor" className="text-2xs font-semibold text-gold-ink hover:underline">
            Supervisor desk
          </Link>
        }
      />
      <div className="grid border-t border-line md:grid-cols-2 md:divide-x md:divide-line">
        <PeopleList title="On duty" rows={onDuty} now={now} empty="Nobody is on patrol in this district." live />
        <PeopleList title="Needs a check-in" rows={atRisk} now={now} empty="Everyone is on track this week." />
      </div>
    </Card>
  );
}

function PeopleList({ title, rows, now, empty, live }: { title: string; rows: ReturnType<typeof roster>; now: number; empty: string; live?: boolean }) {
  return (
    <div className="min-w-0 p-4">
      <p className="mb-2 text-3xs font-semibold text-muted">{title}</p>
      {rows.length === 0 ? (
        <p className="text-2xs text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.slice(0, 5).map((r) => (
            <li key={r.member.id}>
              <Link href={`/hq/roster?member=${r.member.id}`} className="flex items-center gap-2.5 rounded-md hover:bg-surface-2">
                <Avatar name={r.member.name} size={26} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-medium">{r.member.name}</span>
                  <span className="block truncate text-3xs text-muted">
                    <RankMark rank={r.member.rank} /> · {r.member.callsign}
                  </span>
                </span>
                {live && r.onDuty ? (
                  <span className="flex items-center gap-1.5 text-3xs font-semibold text-gold-ink tabular">
                    <Dot tone="gold" live /> {formatMinutes(Math.floor((now - r.onDuty.start) / 60000))}
                  </span>
                ) : (
                  <span className="text-3xs font-semibold text-amber tabular">{formatMinutes(r.week)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommandSnapshot({ state, now }: { state: PreviewState; now: number }) {
  const rows = useMemo(() => roster(state, now), [state, now]);
  const count = (b: string) => rows.filter((r) => r.band === b).length;
  const onDuty = rows.filter((r) => r.onDuty).length;
  const open = openRequests(state).length;
  const overdue = openRequests(state).filter((r) => r.dueAt && r.dueAt < now).length;
  return (
    <Card>
      <CardHeader
        title="Department snapshot"
        description="Sample data · live from the preview store"
        action={
          <ButtonLink href="/hq/command" size="xs" variant="secondary">
            Command Center
          </ButtonLink>
        }
      />
      <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
        {[
          { l: "On duty now", v: onDuty, s: `of ${rows.length} members` },
          { l: "Met 3h this week", v: count("met"), s: `${count("on-track")} on track` },
          { l: "Below half", v: count("at-risk"), s: "need a check-in", warn: count("at-risk") > 0 },
          { l: "Open requests", v: open, s: overdue ? `${overdue} past due` : "none past due", warn: overdue > 0 },
        ].map((k) => (
          <div key={k.l} className="bg-surface px-4 py-3">
            <p className="text-3xs text-muted">{k.l}</p>
            <p className={cn("display mt-1 text-xl font-bold tabular", k.warn ? "text-amber" : "text-ink")}>{k.v}</p>
            <p className="text-3xs text-muted">{k.s}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-3.5">
        <StackBar
          label="Weekly compliance"
          segments={[
            { label: "Met", value: count("met"), className: "bg-gold" },
            { label: "On track", value: count("on-track"), className: "bg-ink/70" },
            { label: "Below half", value: count("at-risk"), className: "bg-amber" },
            { label: "Exempt", value: count("exempt"), className: "bg-line-strong" },
          ]}
        />
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-3xs text-muted">
          <Legend c="bg-gold" l={`Met ${count("met")}`} />
          <Legend c="bg-ink/70" l={`On track ${count("on-track")}`} />
          <Legend c="bg-amber" l={`Below half ${count("at-risk")}`} />
          <Legend c="bg-line-strong" l={`Exempt ${count("exempt")}`} />
        </p>
      </div>
    </Card>
  );
}


function DashboardSkeleton() {
  return (
    <Page wide>
      <Skeleton className="mb-2 h-3 w-40" />
      <Skeleton className="mb-6 h-7 w-72" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-52 rounded-xl" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
    </Page>
  );
}

