"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout, toast } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { can, RANKS, type Actor, type Capability } from "@/lib/authz";
import { cn } from "@/lib/cn";
import { actorFor, allMembers, OperationError, personnel, type PersonnelChange } from "@/lib/preview/store";
import { DIVISIONS, VEHICLES, vehicleAuthorized, type Member } from "@/lib/sample-data";

export type AdminAction = "rank" | "district" | "divisions" | "callsign" | "status";

export const ADMIN_ACTIONS: { value: AdminAction; label: string }[] = [
  { value: "rank", label: "Change rank" },
  { value: "district", label: "Transfer district" },
  { value: "divisions", label: "Edit divisions" },
  { value: "callsign", label: "Change call sign" },
  { value: "status", label: "Change status" },
];

/** Capabilities worth surfacing when a change would grant or remove them. */
const VISIBLE_CAPS: [Capability, string][] = [
  ["patrol.start", "Start independent patrol"],
  ["request.review", "Review member requests"],
  ["supervisor.view", "Supervisor desk"],
  ["discipline.report", "Document and escalate discipline"],
  ["discipline.issue", "Issue formal discipline"],
  ["command.view", "Command Center"],
  ["personnel.manage", "Manage personnel records"],
  ["request.review.loa_extension", "Decide LOA extensions"],
];

function consequences(before: Member, after: Member) {
  const a: Actor = actorFor(before);
  const b: Actor = actorFor(after);
  const gained = VISIBLE_CAPS.filter(([c]) => !can(a, c) && can(b, c)).map(([, l]) => l);
  const lost = VISIBLE_CAPS.filter(([c]) => can(a, c) && !can(b, c)).map(([, l]) => l);
  const vGained = VEHICLES.filter((v) => !vehicleAuthorized(before.rank, v.minRank) && vehicleAuthorized(after.rank, v.minRank)).map((v) => v.name);
  const vLost = VEHICLES.filter((v) => vehicleAuthorized(before.rank, v.minRank) && !vehicleAuthorized(after.rank, v.minRank)).map((v) => v.name);
  return { gained, lost, vGained, vLost };
}

export function AdminDialog({ member, action, onClose }: { member: Member | null; action: AdminAction | null; onClose: () => void }) {
  const id = useId();
  const [rank, setRank] = useState<Member["rank"]>("Officer");
  const [district, setDistrict] = useState<Member["district"]>("North");
  const [divisions, setDivisions] = useState<string[]>([]);
  const [callsign, setCallsign] = useState("");
  const [status, setStatus] = useState<Member["status"]>("Active");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    setRank(member.rank);
    setDistrict(member.district);
    setDivisions(member.divisions);
    setCallsign(member.callsign);
    setStatus(member.status);
    setReason("");
    setError(null);
  }, [member, action]);

  const change: PersonnelChange = useMemo(() => {
    switch (action) {
      case "rank":
        return { rank };
      case "district":
        return { district };
      case "divisions":
        return { divisions };
      case "callsign":
        return { callsign: callsign.trim().toUpperCase() };
      case "status":
        return { status };
      default:
        return {};
    }
  }, [action, rank, district, divisions, callsign, status]);

  if (!member || !action) return <Dialog open={false} onClose={onClose} title="" />;

  const after: Member = { ...member, ...change } as Member;
  const c = consequences(member, after);
  const members = allMembers();
  const changed = JSON.stringify(after) !== JSON.stringify(member);
  const callsignTaken = action === "callsign" && members.some((m) => m.id !== member.id && m.callsign === change.callsign);
  const label = ADMIN_ACTIONS.find((x) => x.value === action)!.label;
  const verb = action === "rank" ? (RANKS.indexOf(rank) < RANKS.indexOf(member.rank) ? "promotion" : "demotion") : label.toLowerCase();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !member) return;
    setBusy(true);
    setError(null);
    try {
      const entries = await personnel.change(member.id, change, reason);
      toast("success", `${member.name}: ${entries.map((x) => x.action.toLowerCase()).join(", ")} recorded`, "Saved to the audit log with your reason.");
      onClose();
    } catch (err) {
      if (!(err instanceof OperationError && err.message === "Already in progress")) setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      size="lg"
      onClose={() => !busy && onClose()}
      title={`${label}: ${member.name}`}
      description="Review what changes before you confirm. Every change is logged with your reason."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-f`} loading={busy} disabled={!changed || callsignTaken} variant={action === "status" && status === "Suspended" ? "danger" : "primary"}>
            {busy ? "Saving…" : changed ? `Confirm ${verb}` : "No change yet"}
          </Button>
        </>
      }
    >
      <form id={`${id}-f`} onSubmit={submit} className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          {action === "rank" ? (
            <Field label="New rank" htmlFor={`${id}-v`} hint={`Current: ${member.rank}`}>
              <Select id={`${id}-v`} value={rank} onChange={(e) => setRank(e.target.value as Member["rank"])} className="w-full">
                {RANKS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          ) : action === "district" ? (
            <Field label="New district" htmlFor={`${id}-v`} hint={`Current: ${member.district}`}>
              <Select id={`${id}-v`} value={district} onChange={(e) => setDistrict(e.target.value as Member["district"])} className="w-full">
                {(["North", "South", "Department"] as const).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
          ) : action === "divisions" ? (
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold">Divisions</legend>
              <ul className="flex flex-col gap-1">
                {DIVISIONS.map((d) => {
                  const on = divisions.includes(d.name);
                  const filled = members.filter((m) => m.divisions.includes(d.name) && m.id !== member.id).length;
                  const full = filled >= d.capacity;
                  return (
                    <li key={d.slug}>
                      <label className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs ring-1 ring-inset", on ? "bg-gold-soft ring-gold/40" : "ring-line hover:bg-surface-2")}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!on && (divisions.length >= 3 || full)}
                          onChange={() => setDivisions((ds) => (on ? ds.filter((x) => x !== d.name) : [...ds, d.name]))}
                          className="size-3.5 accent-[var(--gold-ink)]"
                        />
                        <span className="flex-1 font-medium">{d.name}</span>
                        <span className={cn("text-3xs tabular", full ? "font-semibold text-red" : "text-muted")}>
                          {filled}/{d.capacity}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1.5 text-2xs text-muted">{divisions.length} of 3 allowed at any rank (Handbook §9.3).</p>
            </fieldset>
          ) : action === "callsign" ? (
            <Field label="New call sign" htmlFor={`${id}-v`} hint="North X-4xx · South X-5xx" error={callsignTaken ? `${change.callsign} is already assigned.` : null}>
              <Input id={`${id}-v`} value={callsign} onChange={(e) => setCallsign(e.target.value)} aria-invalid={callsignTaken || undefined} />
            </Field>
          ) : (
            <Field label="New status" htmlFor={`${id}-v`} hint={`Current: ${member.status}`}>
              <Select id={`${id}-v`} value={status} onChange={(e) => setStatus(e.target.value as Member["status"])} className="w-full">
                {(["Active", "On leave", "Suspended"] as const).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Reason" htmlFor={`${id}-r`} error={error} hint="Shown in the member’s history and the audit log.">
            <Textarea id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} aria-invalid={!!error || undefined} />
          </Field>
        </div>

        <section aria-label="What changes" className="rounded-lg bg-surface-2 p-4 ring-1 ring-line ring-inset">
          <p className="text-xs font-semibold">What changes</p>
          {!changed ? (
            <p className="mt-2 text-2xs text-muted">Pick a new value to see the effect.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3 text-2xs">
              {action === "rank" ? <Diff label="Rank" from={member.rank} to={rank} /> : null}
              {action === "district" ? <Diff label="District" from={member.district} to={district} /> : null}
              {action === "callsign" ? <Diff label="Call sign" from={member.callsign} to={change.callsign!} /> : null}
              {action === "status" ? <Diff label="Status" from={member.status} to={status} /> : null}
              {action === "divisions" ? <Diff label="Divisions" from={member.divisions.join(", ") || "None"} to={divisions.join(", ") || "None"} /> : null}
              {c.gained.map((g) => (
                <Line key={g} plus>
                  Gains access: {g}
                </Line>
              ))}
              {c.lost.map((g) => (
                <Line key={g}>Loses access: {g}</Line>
              ))}
              {c.vGained.map((v) => (
                <Line key={v} plus>
                  Authorized to drive the {v} (Handbook §11)
                </Line>
              ))}
              {c.vLost.map((v) => (
                <Line key={v}>No longer authorized for the {v}</Line>
              ))}
              {action === "district" && district !== "Department" ? <Line>Call sign should move into the {district} range ({district === "North" ? "X-4xx" : "X-5xx"}). Change it separately.</Line> : null}
              {action === "status" && status === "On leave" ? <Line>Exempt from the weekly requirement while on leave (Handbook §5.4)</Line> : null}
            </ul>
          )}
          {action === "status" && status === "Suspended" ? (
            <div className="mt-4">
              <Callout tone="error" title="Suspension removes all access">
                Patrol, requests and every portal permission stop until the status changes back.
              </Callout>
            </div>
          ) : null}
        </section>
      </form>
    </Dialog>
  );
}

function Diff({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <li>
      <p className="text-3xs text-muted">{label}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted line-through">{from}</span>
        <ArrowRight className="size-3.5 text-muted" aria-hidden />
        <span className="font-semibold">{to}</span>
      </p>
    </li>
  );
}

function Line({ plus, children }: { plus?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {plus ? <Plus className="mt-0.5 size-3.5 shrink-0 text-green" aria-hidden /> : <Minus className="mt-0.5 size-3.5 shrink-0 text-amber" aria-hidden />}
      <span>{children}</span>
    </li>
  );
}
