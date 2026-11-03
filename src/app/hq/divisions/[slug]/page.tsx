import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/hq/page-header";
import { Avatar, Badge, Meter, Panel, PanelHeader } from "@/components/ui/primitives";
import { DIVISIONS, MEMBERS } from "@/lib/sample-data";
import { cn } from "@/lib/cn";

export function generateStaticParams() {
  return DIVISIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: DIVISIONS.find((d) => d.slug === slug)?.name ?? "Division" };
}

export default async function DivisionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const division = DIVISIONS.find((d) => d.slug === slug);
  if (!division) notFound();

  const roster = MEMBERS.filter((m) => m.divisions.includes(division.name));
  const filled = roster.length;

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/hq/divisions/waterfront", label: "Divisions" }]}
        title={division.name}
        description={division.callsign ? `Radio call sign “${division.callsign}” · prefix ${division.prefix}` : `Call sign prefix ${division.prefix}`}
      />

      <nav aria-label="Divisions" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1 border-b border-line">
          {DIVISIONS.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/hq/divisions/${d.slug}`}
                aria-current={d.slug === slug ? "page" : undefined}
                className={cn(
                  "-mb-px block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
                  d.slug === slug ? "border-blue font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel aria-labelledby="div-roster">
          <PanelHeader id="div-roster" title="Division roster" description={`${filled} of ${division.capacity} positions filled`} />
          {roster.length ? (
            <ul className="divide-y divide-line">
              {roster.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-10 text-xs text-muted tabular">
                    {division.prefix}-{String(i + 1).padStart(2, "0")}
                  </span>
                  <Avatar name={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                    <p className="truncate text-xs text-muted">
                      {m.rank} · {m.callsign}
                    </p>
                  </div>
                  {i === 0 && m.rank === "Captain" ? <Badge tone="gold">Commander</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">No members assigned yet.</p>
          )}
          <div className="flex items-center gap-3 border-t border-line px-5 py-3 text-xs text-muted">
            <span>{division.capacity - filled} vacancies</span>
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel aria-labelledby="cap-title">
            <PanelHeader id="cap-title" title="Staffing" />
            <div className="flex flex-col gap-2 px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">Filled</span>
                <span className="font-semibold tabular">
                  {filled} / {division.capacity}
                </span>
              </div>
              <Meter value={filled} max={division.capacity} label="Division staffing" />
            </div>
          </Panel>
          <Panel aria-labelledby="rules-title">
            <PanelHeader id="rules-title" title="Assignment rules" description="Handbook §9.3" />
            <ul className="flex flex-col gap-2.5 px-5 py-4 text-sm text-ink-2">
              <li>Members may hold up to three subdivisions at once.</li>
              <li>Divisions do not set their own activity quotas; the department-wide 3 hours applies.</li>
              <li className="text-muted">Branch: {division.branch === "Unassigned" ? "awaiting leadership confirmation" : division.branch}</li>
            </ul>
          </Panel>
          <Panel aria-labelledby="ann-title">
            <PanelHeader id="ann-title" title="Announcements" />
            <p className="px-5 py-4 text-sm text-muted">No announcements. Division command can post updates here.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
