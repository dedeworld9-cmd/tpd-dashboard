import { PageHeader } from "@/components/hq/page-header";
import { EmptyState, Panel } from "@/components/ui/primitives";

export const metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile, linked accounts and preferences." />
      <Panel>
        <EmptyState title="Planned for Milestone 2" body="Profile and Discord account linking arrive with sign-in." />
      </Panel>
    </>
  );
}
