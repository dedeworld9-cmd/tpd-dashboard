import { Suspense } from "react";
import { ActivityWorkspace } from "@/components/workspaces/activity";
import { LivePatrol } from "@/components/patrol/live-patrol";
import { LiveSwitch } from "@/components/auth/live-gate";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <Suspense>
      <LiveSwitch demo={<ActivityWorkspace />} live={<LivePatrol section="activity" />} />
    </Suspense>
  );
}
