import { PageHeader } from "@/components/hq/page-header";
import { PatrolConsole } from "@/components/hq/patrol-console";
import { formatMinutes } from "@/components/hq/hour-meter";
import { Badge, Panel, PanelHeader } from "@/components/ui/primitives";
import { ME, MY_SESSIONS } from "@/lib/sample-data";

export const metadata = { title: "Patrol" };

export default function PatrolPage() {
  return (
    <>
      <PageHeader title="Patrol" description="Start and end your shift. All incident reporting stays in AnchorCAD." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel aria-label="Patrol control">
          <PatrolConsole weekMinutes={ME.weekMinutes} homeDistrict={ME.district === "South" ? "South" : "North"} />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel aria-labelledby="rules-title">
            <PanelHeader id="rules-title" title="Before you go on duty" />
            <ul className="flex flex-col gap-3 px-5 py-4 text-sm text-ink-2">
              <li>Log accurate start and end times. Corrections need a reason and a reviewer (Handbook §6).</li>
              <li>No pursuit without authorization from an on-duty Sergeant or above (Handbook §7).</li>
              <li>Notify the communications center when entering another agency&apos;s jurisdiction (Handbook §7.2).</li>
              <li>Record bodycam footage when your setup allows and attach it in AnchorCAD (Handbook §10.1).</li>
            </ul>
          </Panel>
          <Panel aria-labelledby="hist-title">
            <PanelHeader id="hist-title" title="Recent sessions" />
            <ul className="divide-y divide-line">
              {MY_SESSIONS.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{s.date}</p>
                    <p className="text-2xs text-muted tabular">
                      {s.start}–{s.end} · {s.district}
                    </p>
                  </div>
                  {s.flag ? <Badge tone="amber">{s.flag}</Badge> : null}
                  <span className="text-sm font-semibold tabular">{formatMinutes(s.minutes)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
