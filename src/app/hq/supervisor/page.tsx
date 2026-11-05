import { SupervisorWorkspace } from "@/components/workspaces/supervisor";
import { LiveSupervisor } from "@/components/patrol/live-supervisor";
import { LiveSwitch } from "@/components/auth/live-gate";

export const metadata = { title: "Supervisor" };

export default function SupervisorPage() {
  return <LiveSwitch demo={<SupervisorWorkspace />} live={<LiveSupervisor />} />;
}
