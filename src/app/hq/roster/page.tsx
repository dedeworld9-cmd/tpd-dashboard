import { PageHeader } from "@/components/hq/page-header";
import { RosterTable } from "@/components/hq/roster-table";
import { Panel } from "@/components/ui/primitives";
import { MEMBERS } from "@/lib/sample-data";

export const metadata = { title: "Personnel" };

export default async function RosterPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return (
    <>
      <PageHeader
        title="Personnel"
        description="The department roster. Rank, district and division assignments come from the official roster."
      />
      <Panel className="overflow-hidden">
        <RosterTable members={MEMBERS} initialQuery={q ?? ""} />
      </Panel>
    </>
  );
}
