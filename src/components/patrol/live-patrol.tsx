"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Radio, ShieldCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { patrolEnd, patrolHistory, patrolStart, type RecordedPatrol } from "@/lib/backend/patrol";
import { formatClock, formatMinutes, weekMinutes } from "@/lib/domain/activity";

const fmt = (value: string) => new Date(value).toLocaleString();
function elapsedSeconds(s: RecordedPatrol, now: number): number {
  return Math.max(0, (new Date(s.ended_at ?? new Date(now).toISOString()).getTime() - new Date(s.started_at).getTime()) / 1000);
}

function RecordedHistory({ sessions }: { sessions: RecordedPatrol[] }) {
  return (
    <Card>
      <CardHeader title="My recorded patrols" description="Original server timestamps are preserved. Sessions requiring review are excluded from approved totals." />
      {sessions.length === 0 ? (
        <EmptyState title="No recorded patrols yet" body="Your completed sessions will appear here after the server confirms them." icon={<Clock3 />} />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
              <div>
                <p className="font-semibold">{s.district} District</p>
                <p className="mt-0.5 text-muted">{fmt(s.started_at)} — {s.ended_at ? fmt(s.ended_at) : "On duty"}</p>
                {s.review_required && <p className="mt-1 text-amber">Over 12 hours — review required; not approved time</p>}
              </div>
              <span className="font-semibold tabular">{s.ended_at ? formatClock(Math.min(elapsedSeconds(s, 0), 12 * 3600)) : "Active"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function LivePatrol({ section = "patrol" }: { section?: "patrol" | "activity" }) {
  const me = useVerifiedMember();
  const [sessions, setSessions] = useState<RecordedPatrol[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [district, setDistrict] = useState<"North" | "South">("North");
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSessions(await patrolHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load patrol history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const active = sessions.find((s) => s.ended_at === null);
  const completedApproved = sessions.filter((s) => s.ended_at !== null && !s.review_required)
    .map((s) => ({
      start: new Date(s.started_at).getTime(),
      end: new Date(s.ended_at!).getTime(),
    }));
  const completedMinutes = weekMinutes(completedApproved, new Date(now));

  async function run(op: "start" | "end") {
    if (inFlight.current || loading || !me) return;
    if (op === "end" && !active) return;
    if (op === "end" && !window.confirm("End your current patrol? The server will record the end time.")) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (op === "start") await patrolStart(district);
      else await patrolEnd(active!.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patrol operation failed.");
      // A request might have succeeded despite a network timeout: always reconcile with server.
      try { setSessions(await patrolHistory()); } catch {}
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  if (!me) return null;
  const isProbationary = me.rank === "Probationary Officer";
  return (
    <Page wide>
      <PageHeader eyebrow="Operations" title={section === "patrol" ? "Patrol console" : "My activity"}
        description="Sessions are saved in Supabase using server timestamps. Monday–Sunday in Eastern Time is an interim reporting week (PC-14)." />
      <div className="space-y-5">
        {error && <Callout tone="error" title="Patrol backend error">{error} Your session was not modified locally. Use Refresh to verify server state.</Callout>}
        <Callout tone="info" title="Recorded hours are not automatically approved">
          The 3-hour weekly requirement is Handbook §3.2. Only completed, unflagged sessions appear in the provisional recorded total; supervisor approval and corrections are not yet implemented.
        </Callout>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-dark-line bg-obsidian p-5 text-on-dark sm:p-7">
            <div className="flex items-center gap-2 text-xs font-semibold text-gold"><Radio className="size-4" /> {active ? "On duty" : "Off duty"}</div>
            <p className="display-x mt-3 text-4xl font-bold tabular sm:text-6xl">{active ? formatClock(elapsedSeconds(active, now)) : "00:00:00"}</p>
            {active ? (
              <>
                <p className="mt-3 text-sm">Patrolling {active.district} District since {fmt(active.started_at)}</p>
                <Button variant="danger" size="lg" className="mt-6" disabled={busy || loading} loading={busy} onClick={() => void run("end")}>End patrol</Button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-on-dark-muted">Select a district and start your official patrol timer.</p>
                <fieldset className="mt-5 flex gap-4 text-sm" disabled={busy || loading || isProbationary}>
                  <legend className="mb-2 text-xs">District</legend>
                  {(["North", "South"] as const).map((d) => (
                    <label className="flex items-center gap-2" key={d}>
                      <input type="radio" name="live-patrol-district" value={d} checked={district === d} onChange={() => setDistrict(d)} /> {d}
                    </label>
                  ))}
                </fieldset>
                {isProbationary ? <p className="mt-4 text-xs text-amber">Independent patrol is locked until training approval exists.</p> :
                  <Button variant="gold" size="lg" className="mt-5" disabled={busy || loading} loading={busy} onClick={() => void run("start")}>Start patrol</Button>}
              </>
            )}
            <Button variant="dark-ghost" size="sm" className="mt-5" disabled={busy || loading} onClick={() => void reload()}>Refresh server status</Button>
          </section>
          <Card className="p-5">
            <ShieldCheck className="size-5 text-gold-ink" aria-hidden />
            <p className="mt-4 text-2xs text-muted">Completed, unflagged time this week</p>
            <p className="display mt-2 text-3xl font-bold tabular">{formatMinutes(completedMinutes)}</p>
            <p className="mt-2 text-xs text-muted">Provisional recorded total / 3h requirement. Active sessions, reviewed exceptions, exemptions, and corrections are not included.</p>
            <Link href="/hq/resources" className="mt-5 inline-block text-xs font-semibold text-gold-ink underline">View patrol policies</Link>
          </Card>
        </div>
        {loading ? <p role="status" className="text-sm text-muted">Loading official patrol sessions…</p> : <RecordedHistory sessions={sessions} />}
      </div>
    </Page>
  );
}
