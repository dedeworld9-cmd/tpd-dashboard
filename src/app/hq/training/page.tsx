import { Check, Circle, CircleDot } from "lucide-react";
import { PageHeader } from "@/components/hq/page-header";
import { Avatar, Badge, Panel, PanelHeader } from "@/components/ui/primitives";
import { TRAINING_MODULES } from "@/lib/sample-data";
import { cn } from "@/lib/cn";

export const metadata = { title: "Training" };

const TRAINEE = { name: "M. Castellanos", callsign: "X-445", pto: "M. Okonkwo", hired: "Oct 30" };

export default function TrainingPage() {
  const done = TRAINING_MODULES.filter((m) => m.state === "Complete").length;
  return (
    <>
      <PageHeader
        title="Probationary training"
        description="Example trainee view of the path every new officer completes before independent patrol (Handbook §3.1)."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel aria-labelledby="path-title">
          <PanelHeader id="path-title" title="Your pathway" description={`${done} of ${TRAINING_MODULES.length} modules complete`} />
          <ol className="relative px-5 py-2">
            {TRAINING_MODULES.map((m, i) => {
              const last = i === TRAINING_MODULES.length - 1;
              return (
                <li key={m.key} className="relative flex gap-4 py-4">
                  {!last ? (
                    <span aria-hidden className={cn("absolute left-[11px] top-11 bottom-0 w-px", m.state === "Complete" ? "bg-blue" : "bg-line")} />
                  ) : null}
                  <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface">
                    {m.state === "Complete" ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-blue text-on-blue">
                        <Check aria-hidden className="size-3.5" strokeWidth={3} />
                      </span>
                    ) : m.state === "In progress" ? (
                      <CircleDot aria-hidden className="size-6 text-blue" />
                    ) : (
                      <Circle aria-hidden className="size-6 text-line-strong" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-ink">{m.title}</h3>
                      <Badge tone={m.state === "Complete" ? "green" : m.state === "In progress" ? "blue" : "neutral"}>{m.state}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{m.detail}</p>
                    {m.signedBy ? (
                      <p className="mt-1.5 text-xs text-muted">
                        Signed off by {m.signedBy} on {m.date}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-line bg-sunken/60 px-5 py-4 text-xs text-muted">
            Independent patrol is approved by the Office of the Chiefs once every module is complete. Until then you are
            exempt from the weekly activity requirement.
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel aria-labelledby="trainee-title">
            <PanelHeader id="trainee-title" title="Trainee" />
            <div className="flex items-center gap-3 px-5 py-4">
              <Avatar name={TRAINEE.name} size={40} />
              <div>
                <p className="text-sm font-semibold text-ink">{TRAINEE.name}</p>
                <p className="text-xs text-muted">
                  {TRAINEE.callsign} · Probationary Officer · since {TRAINEE.hired}
                </p>
              </div>
            </div>
          </Panel>
          <Panel aria-labelledby="pto-title">
            <PanelHeader id="pto-title" title="Police Training Officer" description="Selected and approved by the Office of the Chiefs" />
            <div className="flex items-center gap-3 px-5 py-4">
              <Avatar name={TRAINEE.pto} size={40} />
              <div>
                <p className="text-sm font-semibold text-ink">{TRAINEE.pto}</p>
                <p className="text-xs text-muted">Next mentored patrol not scheduled</p>
              </div>
            </div>
          </Panel>
          <Panel aria-labelledby="quals-title">
            <PanelHeader id="quals-title" title="Qualifications" />
            <p className="px-5 py-4 text-sm text-muted">
              None yet. Qualifications appear here when an authorized officer records them; they are never granted automatically.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
