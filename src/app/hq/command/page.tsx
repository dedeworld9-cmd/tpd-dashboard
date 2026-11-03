import Link from "next/link";
import { PageHeader } from "@/components/hq/page-header";
import { HourMeter, formatMinutes } from "@/components/hq/hour-meter";
import { Badge, Meter, Panel, PanelHeader } from "@/components/ui/primitives";
import { DIVISIONS, MEMBERS, REQUESTS } from "@/lib/sample-data";
import { stateTone } from "@/lib/request-tone";

export const metadata = { title: "Command Center" };

export default function CommandPage() {
  const active = MEMBERS.filter((m) => m.status !== "Suspended");
  const exempt = (m: (typeof MEMBERS)[number]) => m.status === "On leave" || m.status === "Probationary";
  const counted = active.filter((m) => !exempt(m));
  const meeting = counted.filter((m) => m.weekMinutes >= 180);
  const behind = counted.filter((m) => m.weekMinutes < 180).sort((a, b) => a.weekMinutes - b.weekMinutes);
  const open = REQUESTS.filter((r) => r.state === "Submitted" || r.state === "Under review");

  const summary = [
    { label: "Active personnel", value: String(active.length), note: "of 134 sworn positions" },
    { label: "Meeting 3 hours", value: `${meeting.length} / ${counted.length}`, note: `${active.length - counted.length} exempt (leave or probation)` },
    { label: "Awaiting decision", value: String(open.length), note: "requests across the department" },
    { label: "On leave", value: String(active.filter((m) => m.status === "On leave").length), note: "approved leaves of absence" },
  ];

  return (
    <>
      <PageHeader title="Command Center" description="Staffing, weekly compliance and pending decisions for the whole department." />

      <Panel className="mb-6 overflow-hidden">
        <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular">{s.value}</dd>
              <dd className="mt-0.5 text-2xs text-muted">{s.note}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="behind-title">
          <PanelHeader id="behind-title" title="Below 3 hours this week" description="Exempt members are excluded" />
          <ul className="divide-y divide-line">
            {behind.map((m) => (
              <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_120px_56px] items-center gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    <span className="text-muted tabular">{m.callsign}</span> {m.name}
                  </p>
                  <p className="truncate text-2xs text-muted">
                    {m.rank} · {m.district}
                  </p>
                </div>
                <HourMeter minutes={m.weekMinutes} />
                <span className="text-right text-sm font-semibold tabular">{formatMinutes(m.weekMinutes)}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-2xs text-muted">
            Shown for follow-up only. The handbook leaves consequences to the chain of command; nothing here is automatic.
          </p>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel aria-labelledby="queue-title">
            <PanelHeader id="queue-title" title="Approval queue" action={<Link href="/hq/requests" className="text-xs font-semibold text-blue hover:underline">Open request center</Link>} />
            <ul className="divide-y divide-line">
              {open.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{r.type}</p>
                    <p className="truncate text-2xs text-muted">
                      {r.callsign} {r.member} · {r.reviewer ? `with ${r.reviewer}` : "unassigned"}
                    </p>
                  </div>
                  <Badge tone={stateTone(r.state)}>{r.state}</Badge>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel aria-labelledby="divs-title">
            <PanelHeader id="divs-title" title="Division staffing" />
            <ul className="flex flex-col gap-4 px-5 py-4">
              {DIVISIONS.map((d) => {
                const filled = MEMBERS.filter((m) => m.divisions.includes(d.name)).length;
                return (
                  <li key={d.slug}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <Link href={`/hq/divisions/${d.slug}`} className="text-ink hover:text-blue">
                        {d.name}
                      </Link>
                      <span className="text-muted tabular">
                        {filled} / {d.capacity}
                      </span>
                    </div>
                    <Meter value={filled} max={d.capacity} label={`${d.name} staffing`} />
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
