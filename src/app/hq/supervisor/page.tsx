import { PageHeader } from "@/components/hq/page-header";
import { EmptyState, Panel } from "@/components/ui/primitives";

export const metadata = { title: "Supervisor workspace" };

export default function Page() {
  return (
    <>
      <PageHeader title="Supervisor workspace" description="Your district's patrol, trainees and pending reviews." />
      <Panel>
        <EmptyState title="Planned for Milestone 4" body="Supervisor tools arrive with the request and approval workflows." />
      </Panel>
    </>
  );
}
