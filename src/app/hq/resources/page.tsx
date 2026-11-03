import { PageHeader } from "@/components/hq/page-header";
import { EmptyState, Panel } from "@/components/ui/primitives";

export const metadata = { title: "Resources" };

export default function Page() {
  return (
    <>
      <PageHeader title="Resources" description="Official policies, the fleet matrix and AnchorCAD guidance." />
      <Panel>
        <EmptyState title="Planned for Milestone 4" body="The library will link to the official Google Docs, which stay authoritative." />
      </Panel>
    </>
  );
}
