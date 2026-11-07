import { LiveSwitch } from "@/components/auth/live-gate";
import { LiveOverview } from "@/components/auth/live-pages";
import { Dashboard } from "@/components/dashboard/dashboard";

export const metadata = { title: "Overview" };

export default function OverviewPage() {
  return <LiveSwitch demo={<Dashboard />} live={<LiveOverview />} />;
}
