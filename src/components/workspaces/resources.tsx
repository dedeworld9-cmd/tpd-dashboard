import { ArrowUpRight, ExternalLink, FileText, Scale } from "lucide-react";
import { PolicyRefs } from "@/components/patrol/patrol-console";
import { Page, PageHeader } from "@/components/shell/page";
import { ANCHORCAD_URL } from "@/components/shell/nav-config";
import { Card, CardHeader } from "@/components/ui/surface";
import { HANDBOOK_URL, USE_OF_FORCE_URL } from "@/lib/public-nav";
import { RANKS, VEHICLES, vehicleAuthorized } from "@/lib/sample-data";

export function ResourcesWorkspace() {
  return (
    <Page wide>
      <PageHeader eyebrow="Department" title="Resources" description="The official policy documents, the fleet matrix and AnchorCAD. The Google Docs stay authoritative; summaries here are only a guide." />
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { href: HANDBOOK_URL, icon: FileText, title: "Personnel Policy & Procedures Handbook", meta: "Effective October 30, 2026 · approved by the Chief of Police" },
          { href: USE_OF_FORCE_URL, icon: Scale, title: "Use of Force Policy", meta: "Issued October 30, 2026 · approved by the Chief of Police" },
        ].map((d) => (
          <a key={d.title} href={d.href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm hover:border-line-strong">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-obsidian text-gold">
              <d.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{d.title}</span>
              <span className="mt-0.5 block text-2xs text-muted">{d.meta}</span>
            </span>
            <ArrowUpRight className="size-4 text-muted group-hover:text-ink" aria-hidden />
          </a>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Fleet matrix" description="Which ranks may drive each vehicle (roster, Vehicles tab; Handbook §11)" />
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[560px] text-left text-xs whitespace-nowrap">
              <thead className="bg-surface-2 text-3xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Rank</th>
                  {VEHICLES.map((v) => (
                    <th key={v.name} scope="col" className="px-3 py-2 text-center font-semibold">{v.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {RANKS.map((r) => (
                  <tr key={r}>
                    <th scope="row" className="px-4 py-2 font-medium">{r}</th>
                    {VEHICLES.map((v) => (
                      <td key={v.name} className="px-3 py-2 text-center">
                        {vehicleAuthorized(r, v.minRank) ? <span className="font-semibold text-green">Yes</span> : <span className="text-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="AnchorCAD" description="All arrests, citations and incidents are filed in AnchorCAD (Handbook §10)" />
            <div className="border-t border-line px-4 py-3.5">
              {ANCHORCAD_URL ? (
                <a href={ANCHORCAD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-ink hover:underline">
                  Open AnchorCAD <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : (
                <p className="text-2xs text-muted">The AnchorCAD link hasn’t been configured yet. Ask command for the address.</p>
              )}
            </div>
          </Card>
          <PolicyRefs />
        </div>
      </div>
    </Page>
  );
}
