"use client";

import { useState } from "react";
import { Badge, EmptyState, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import type { RequestState, WorkRequest } from "@/lib/sample-data";
import { stateTone } from "@/lib/request-tone";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "open", label: "Open", match: (s: RequestState) => s === "Submitted" || s === "Under review" },
  { key: "drafts", label: "Drafts", match: (s: RequestState) => s === "Draft" },
  { key: "closed", label: "Closed", match: (s: RequestState) => s === "Approved" || s === "Denied" || s === "Withdrawn" },
] as const;

const FLOW: RequestState[] = ["Draft", "Submitted", "Under review", "Approved"];

export function RequestCenter({ requests }: { requests: WorkRequest[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const current = TABS.find((t) => t.key === tab)!;
  const rows = requests.filter((r) => current.match(r.state));
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Panel className="overflow-hidden">
        <div role="tablist" aria-label="Request status" className="flex gap-1 border-b border-line px-3">
          {TABS.map((t) => {
            const count = requests.filter((r) => t.match(r.state)).length;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key);
                  setSelectedId(requests.find((r) => t.match(r.state))?.id ?? null);
                }}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm",
                  tab === t.key ? "border-blue font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span className="rounded-full bg-sunken px-1.5 text-2xs font-semibold text-muted tabular">{count}</span>
              </button>
            );
          })}
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Nothing here" body="Requests you submit or are assigned to review appear in this list." />
        ) : (
          <ul role="tabpanel" className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-pressed={selected?.id === r.id}
                  className={cn(
                    "flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors",
                    selected?.id === r.id ? "bg-blue-soft/60" : "hover:bg-sunken/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink">
                      {r.type}
                      <span className="text-2xs font-normal text-muted tabular">{r.id}</span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {r.callsign} {r.member} · {r.summary}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right text-2xs text-muted sm:block">
                    {r.due ? <p className="font-semibold text-amber">Due {r.due}</p> : <p>{r.submitted}</p>}
                  </div>
                  <Badge tone={stateTone(r.state)}>{r.state}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {selected ? (
        <Panel aria-labelledby="req-detail" className="h-fit lg:sticky lg:top-24">
          <div className="border-b border-line px-5 py-4">
            <p className="text-2xs text-muted tabular">{selected.id}</p>
            <h2 id="req-detail" className="mt-0.5 text-lg font-semibold text-ink">
              {selected.type}
            </h2>
            <p className="mt-1 text-sm text-ink-2">{selected.summary}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm">
            <div>
              <dt className="text-2xs text-muted">Member</dt>
              <dd className="text-ink">
                {selected.callsign} {selected.member}
              </dd>
            </div>
            <div>
              <dt className="text-2xs text-muted">Reviewer</dt>
              <dd className={selected.reviewer ? "text-ink" : "text-amber"}>{selected.reviewer ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-2xs text-muted">Submitted</dt>
              <dd className="text-ink">{selected.submitted}</dd>
            </div>
            <div>
              <dt className="text-2xs text-muted">Decision due</dt>
              <dd className="text-ink">{selected.due ?? "No deadline"}</dd>
            </div>
          </dl>
          <div className="border-t border-line px-5 py-4">
            <p className="mb-3 text-2xs font-medium text-muted">Progress</p>
            <ol className="flex items-center gap-2">
              {(selected.state === "Denied" || selected.state === "Withdrawn"
                ? [...FLOW.slice(0, 3), selected.state]
                : FLOW
              ).map((s, i, arr) => {
                const reached = arr.indexOf(selected.state) >= i;
                return (
                  <li key={s} className="flex flex-1 flex-col gap-1.5">
                    <span className={cn("h-1 rounded-full", reached ? (s === "Denied" ? "bg-red" : "bg-blue") : "bg-sunken")} />
                    <span className={cn("text-2xs", reached ? "text-ink" : "text-muted")}>{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          {selected.state === "Submitted" || selected.state === "Under review" ? (
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
              <Button size="sm" disabled title="Decisions are enabled in Milestone 4">
                Approve
              </Button>
              <Button size="sm" variant="secondary" disabled title="Decisions are enabled in Milestone 4">
                Deny
              </Button>
              <p className="w-full text-2xs text-muted">Decisions are disabled in this preview.</p>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
