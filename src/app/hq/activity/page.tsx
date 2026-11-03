import { PageHeader } from "@/components/hq/page-header";
import { EmptyState, Panel } from "@/components/ui/primitives";

export const metadata = { title: "Activity" };

export default function Page() {
  return (
    <>
      <PageHeader title="Activity" description="Your patrol sessions by week, exemptions and correction requests." />
      <Panel>
        <EmptyState title="Planned for Milestone 3" body="Weekly history and corrections arrive with server-recorded patrol sessions." />
      </Panel>
    </>
  );
}
