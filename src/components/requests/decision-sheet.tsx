"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CheckCircle2, HelpCircle, Info, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout, toast } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { Avatar, RankMark } from "@/components/ui/identity";
import { Sheet } from "@/components/ui/overlay";
import { Pill } from "@/components/ui/status";
import { canDecide, reviewRequirement } from "@/lib/authz";
import { cn } from "@/lib/cn";
import { formatMinutes, REQUIRED_MINUTES, formatTime } from "@/lib/domain/activity";
import { exemptReason, memberWeek } from "@/lib/preview/derived";
import { useMe } from "@/lib/preview/hooks";
import { memberById, OperationError, requests, type Decision, type PreviewState, type RequestRecord } from "@/lib/preview/store";
import { stateTone } from "@/lib/request-tone";

const DECISIONS: { value: Decision; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { value: "Approved", label: "Approve", icon: CheckCircle2, cls: "data-[on=true]:bg-green-soft data-[on=true]:text-green data-[on=true]:ring-green/40" },
  { value: "Denied", label: "Deny", icon: XCircle, cls: "data-[on=true]:bg-red-soft data-[on=true]:text-red data-[on=true]:ring-red/40" },
  { value: "Clarification requested", label: "Ask for info", icon: HelpCircle, cls: "data-[on=true]:bg-info-soft data-[on=true]:text-info data-[on=true]:ring-info/40" },
];

const fmt = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Review panel for one request: context, history, the policy rule that says
 * who decides, and an approve / deny / clarify form that always records a
 * reason. Authorization is checked again inside `requests.decide`.
 */
export function DecisionSheet({ request, state, onClose }: { request: RequestRecord | null; state: PreviewState; onClose: () => void }) {
  const me = useMe();
  const id = useId();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDecision(null);
    setReason("");
    setError(null);
  }, [request?.id]);

  if (!me) return null;
  const r = request;
  const member = r ? memberById(r.memberId) : undefined;
  const reviewer = r?.reviewerId ? memberById(r.reviewerId) : undefined;
  const open = r ? r.state === "Submitted" || r.state === "Under review" : false;
  const allowed = r ? canDecide(me.actor, r.type, r.memberId === me.member.id) : false;
  const session = r?.sessionId ? state.sessions.find((s) => s.id === r.sessionId) : undefined;
  const now = Date.now();
  const week = member ? memberWeek(state, member.id, now) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!r || !decision || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await requests.decide(r.id, decision, reason);
      toast(decision === "Approved" ? "success" : "info", `${r.id} ${decision === "Clarification requested" ? "sent back for more information" : decision.toLowerCase()}`, `Status is now ${next}. ${member?.name ?? "The member"} is notified.`);
      setDecision(null);
      setReason("");
    } catch (err) {
      if (!(err instanceof OperationError && err.message === "Already in progress")) setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!r}
      onClose={() => !busy && onClose()}
      title={r ? `${r.type}` : ""}
      subtitle={
        r ? (
          <span className="flex items-center gap-2">
            {r.id} · submitted {fmt(r.createdAt)} <Pill tone={stateTone(r.state)}>{r.state}</Pill>
          </span>
        ) : null
      }
      footer={
        r && open && allowed ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-3xs text-muted">Your reason is shared with the member and kept in history.</p>
            <Button type="submit" form={`${id}-f`} loading={busy} disabled={!decision} variant={decision === "Denied" ? "danger" : "primary"}>
              {busy ? "Recording…" : decision ? `Record: ${DECISIONS.find((d) => d.value === decision)!.label}` : "Choose a decision"}
            </Button>
          </div>
        ) : undefined
      }
    >
      {r && member ? (
        <div className="flex flex-col gap-5 p-5">
          {/* Member context */}
          <section aria-label="Member" className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 ring-1 ring-line ring-inset">
            <Avatar name={member.name} size={38} />
            <div className="min-w-0 flex-1 leading-tight">
              <Link href={`/hq/roster?member=${member.id}`} className="text-sm font-semibold hover:underline">
                {member.name}
              </Link>
              <p className="mt-0.5 truncate text-3xs text-muted">
                <RankMark rank={member.rank} /> · {member.callsign} · {member.district === "Department" ? "Department" : `${member.district} District`}
              </p>
            </div>
            <div className="text-right leading-tight">
              <p className={cn("text-xs font-semibold tabular", week >= REQUIRED_MINUTES ? "text-green" : "text-ink")}>{formatMinutes(week)}</p>
              <p className="text-3xs text-muted">{exemptReason(member) ? "exempt" : "this week"}</p>
            </div>
          </section>

          <section aria-label="Request">
            <h3 className="text-xs font-semibold">{r.summary}</h3>
            <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-line text-ink-2">{r.detail}</p>
            {session ? (
              <dl className="mt-3 grid grid-cols-3 gap-3 rounded-lg border border-line p-3">
                <div>
                  <dt className="text-3xs text-muted">Session</dt>
                  <dd className="text-xs font-semibold">{session.id}</dd>
                </div>
                <div>
                  <dt className="text-3xs text-muted">Recorded</dt>
                  <dd className="text-xs font-semibold tabular">
                    {formatTime(session.start)}–{session.end ? formatTime(session.end) : "open"}
                  </dd>
                </div>
                <div>
                  <dt className="text-3xs text-muted">Duration</dt>
                  <dd className="text-xs font-semibold tabular">{session.end ? formatMinutes(Math.floor((session.end - session.start) / 60000)) : "—"}</dd>
                </div>
              </dl>
            ) : null}
            {r.type === "Division application" ? (
              <p className="mt-3 flex items-start gap-2 text-2xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Holds {member.divisions.length} of the 3 subdivisions allowed at any rank (Handbook §9.3).
              </p>
            ) : null}
          </section>

          <section aria-label="Policy requirement" className="rounded-lg border border-gold/40 bg-gold-soft/60 px-3.5 py-3">
            <p className="text-3xs font-semibold text-gold-ink">Who decides</p>
            <p className="mt-0.5 text-xs font-medium">{reviewRequirement(r.type)}</p>
            <p className="mt-1 text-3xs text-muted">
              Assigned reviewer: {reviewer ? `${reviewer.name} (${reviewer.rank})` : "unassigned"}
              {r.dueAt ? ` · due ${fmt(r.dueAt)}` : ""}
            </p>
          </section>

          <section aria-label="History">
            <h3 className="mb-2 text-3xs font-semibold text-muted">History</h3>
            <ol className="relative ml-1.5 border-l border-line">
              {r.history.map((e, i) => {
                const who = e.actor === "system" ? "System" : (memberById(e.actor)?.name ?? e.actor);
                const target = e.action === "Assigned" && e.note ? memberById(e.note)?.name : null;
                return (
                  <li key={i} className="relative pb-3 pl-4 last:pb-0">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1 -left-[5px] size-2.5 rounded-full ring-2 ring-surface",
                        e.action === "Approved" ? "bg-green" : e.action === "Denied" ? "bg-red" : e.action === "Clarification requested" ? "bg-info" : "bg-line-strong",
                      )}
                    />
                    <p className="text-xs">
                      <span className="font-semibold">{who}</span> <span className="text-ink-2">{e.action === "Assigned" ? `assigned ${target ?? "a reviewer"}` : e.action.toLowerCase()}</span>
                    </p>
                    {e.note && e.action !== "Assigned" ? <p className="mt-0.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-2xs text-ink-2">“{e.note}”</p> : null}
                    <p className="mt-0.5 text-3xs text-muted">{fmt(e.at)}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          {!open ? (
            <Callout tone="info" title={`This request is ${r.state.toLowerCase()}`}>
              Its history above is the permanent record. No further action is available here.
            </Callout>
          ) : !allowed ? (
            <Callout tone="warn" title={r.memberId === me.member.id ? "You can’t decide your own request" : "You can’t decide this request"}>
              {r.memberId === me.member.id ? "Another reviewer will decide it." : `Requires ${reviewRequirement(r.type)}.`}
            </Callout>
          ) : (
            <form id={`${id}-f`} onSubmit={submit} className="flex flex-col gap-3">
              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold">Decision</legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {DECISIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={decision === d.value}
                      data-on={decision === d.value}
                      onClick={() => setDecision(d.value)}
                      className={cn("flex h-10 items-center justify-center gap-1.5 rounded-md text-xs font-semibold text-ink-2 ring-1 ring-line-strong ring-inset transition-colors hover:bg-surface-2", d.cls)}
                    >
                      <d.icon className="size-4" aria-hidden />
                      {d.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field label="Reason" htmlFor={`${id}-r`} error={error} hint="Required for every decision.">
                <Textarea id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} aria-invalid={!!error || undefined} />
              </Field>
            </form>
          )}
          {r.memberId === me.member.id && open ? (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={async () => {
                try {
                  await requests.withdraw(r.id);
                  toast("info", `${r.id} withdrawn`);
                } catch (err) {
                  toast("error", "Not withdrawn", err instanceof Error ? err.message : undefined);
                }
              }}
            >
              <Undo2 className="size-3.5" aria-hidden /> Withdraw my request
            </Button>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
