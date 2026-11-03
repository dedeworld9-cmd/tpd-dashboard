import Link from "next/link";
import { ArrowUpRight, FileText, Scale } from "lucide-react";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Mark } from "@/components/brand/mark";
import { DIVISIONS } from "@/lib/sample-data";
import { APPLICATION_URL, HANDBOOK_URL, USE_OF_FORCE_URL } from "@/lib/public-nav";

/** HB §3.1 — the steps every new officer completes. This is a real sequence, so it is numbered. */
const PATHWAY = [
  { title: "Apply", body: "Complete the recruitment application. The recruitment team reviews every submission." },
  { title: "Onboarding", body: "Join as a Probationary Patrol Officer and meet the department." },
  { title: "Policy review", body: "Study the Personnel Handbook and the Use of Force Policy." },
  { title: "AnchorCAD and radio", body: "Learn incident reporting in AnchorCAD and radio communication." },
  { title: "Patrol with a PTO", body: "Ride with a Police Training Officer approved by the Office of the Chiefs." },
  { title: "Independent patrol", body: "The Office of the Chiefs signs you off to patrol on your own." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <Mark className="h-14 w-auto" />
            <h1 className="mt-6 max-w-xl text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.025em] text-ink">
              Tampa Police Department
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
              Patrolling the North and South districts of Florida State Roleplay with integrity, accountability and
              service, one documented shift at a time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={APPLICATION_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
                Apply to join
                <ArrowUpRight aria-hidden className="size-4" />
              </a>
              <ButtonLink href="/hq" variant="secondary" size="lg">
                Member sign in
              </ButtonLink>
            </div>
          </div>

          <div id="join" className="scroll-mt-24 rounded-lg border border-line bg-surface p-6 shadow-md sm:p-8">
            <h2 className="text-base font-semibold text-ink">How you join</h2>
            <p className="mt-1 text-sm text-muted">From application to your first solo shift.</p>
            <ol className="mt-6 flex flex-col">
              {PATHWAY.map((step, i) => (
                <li key={step.title} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < PATHWAY.length - 1 ? <span aria-hidden className="absolute left-[13px] top-8 bottom-1 w-px bg-line" /> : null}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-canvas text-xs font-semibold text-ink tabular">
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Standards strip */}
      <section aria-labelledby="values-title" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="values-title" className="sr-only">
            Core values
          </h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Integrity", "Honest and transparent in every duty."],
              ["Accountability", "We own our decisions, including mistakes."],
              ["Service", "The community's safety comes first."],
              ["Professionalism", "Conduct, appearance and communication."],
              ["Respect", "Dignity and fairness for everyone."],
            ].map(([title, body]) => (
              <li key={title}>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Divisions */}
      <section id="divisions" aria-labelledby="div-title" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="max-w-2xl">
            <h2 id="div-title" className="text-2xl font-semibold tracking-tight text-ink">
              Divisions
            </h2>
            <p className="mt-2 text-base text-ink-2">
              Officers can serve in up to three specialized divisions alongside patrol. Applications open to members
              through the headquarters.
            </p>
          </div>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {DIVISIONS.map((d) => (
              <li key={d.slug} className="bg-surface p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink">{d.name}</h3>
                  <span className="shrink-0 text-xs text-muted tabular">{d.callsign || d.prefix}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{d.capacity} positions</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Districts */}
      <section id="districts" aria-labelledby="dist-title" className="scroll-mt-20 border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.4fr] md:py-20">
          <div>
            <h2 id="dist-title" className="text-2xl font-semibold tracking-tight text-ink">
              Two patrol districts
            </h2>
            <p className="mt-2 text-base text-ink-2">
              Patrol is organized into a North and a South district, each with its own Lieutenants, Sergeants and patrol
              officers under a district Captain.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "North District", prefix: "X-4xx call signs" },
              { name: "South District", prefix: "X-5xx call signs" },
            ].map((d) => (
              <div key={d.name} className="rounded-lg border border-line bg-canvas p-6">
                <p className="text-lg font-semibold text-ink">{d.name}</p>
                <p className="mt-1 text-sm text-muted tabular">{d.prefix}</p>
                <p className="mt-6 text-sm text-ink-2">Captain · Lieutenants · Sergeants · Corporals · Senior Officers · Officers</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section id="standards" aria-labelledby="std-title" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <h2 id="std-title" className="text-2xl font-semibold tracking-tight text-ink">
            Policies
          </h2>
          <p className="mt-2 max-w-2xl text-base text-ink-2">
            Every member works to the same written standards. The official documents are the final word.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              { href: HANDBOOK_URL, icon: FileText, title: "Personnel Policy & Procedures Handbook", meta: "Effective October 30, 2026" },
              { href: USE_OF_FORCE_URL, icon: Scale, title: "Use of Force Policy", meta: "Issued October 30, 2026" },
            ].map((doc) => (
              <li key={doc.title}>
                <a
                  href={doc.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong"
                >
                  <doc.icon aria-hidden className="mt-0.5 size-5 text-blue" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-ink">{doc.title}</span>
                    <span className="mt-1 block text-sm text-muted">{doc.meta} · approved by the Chief of Police</span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 text-muted group-hover:text-ink" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            Incident reports are filed in AnchorCAD, the department&apos;s official reporting system.{" "}
            <Link href="/hq" className="font-semibold text-blue hover:underline">
              Members can find training in the headquarters.
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
