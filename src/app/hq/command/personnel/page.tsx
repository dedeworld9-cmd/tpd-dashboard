import { LivePersonnelAdministration } from "@/components/command/live-personnel-admin";
import { LiveSwitch } from "@/components/auth/live-gate";
import { Page, PageHeader } from "@/components/shell/page";
import { Callout } from "@/components/ui/feedback";

export const metadata = { title: "Personnel administration" };

export default function PersonnelAdministrationPage() {
 return <LiveSwitch
  demo={<Page><PageHeader eyebrow="Command" title="Personnel administration" description="Live roster change proposals are disabled in the design preview."/><Callout tone="info" title="Sign in required">Use the verified Headquarters to submit auditable personnel proposals.</Callout></Page>}
  live={<LivePersonnelAdministration />}
 />;
}
