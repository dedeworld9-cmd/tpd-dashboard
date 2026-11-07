import { Suspense } from "react";
import { ActivityWorkspace } from "@/components/workspaces/activity";

export const metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityWorkspace />
    </Suspense>
  );
}
