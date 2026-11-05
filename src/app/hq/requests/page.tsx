import { Suspense } from "react";
import { RequestsWorkspace } from "@/components/requests/requests-workspace";
import { LiveRequests } from "@/components/requests/live-requests";
import { LiveSwitch } from "@/components/auth/live-gate";

export const metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <Suspense>
      <LiveSwitch demo={<RequestsWorkspace />} live={<LiveRequests />} />
    </Suspense>
  );
}
