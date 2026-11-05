import { Suspense } from "react";
import { PatrolConsole } from "@/components/patrol/patrol-console";
import { LivePatrol } from "@/components/patrol/live-patrol";
import { LiveSwitch } from "@/components/auth/live-gate";

export const metadata = { title: "Patrol" };

export default function PatrolPage() {
  return (
    <Suspense>
      <LiveSwitch demo={<PatrolConsole />} live={<LivePatrol />} />
    </Suspense>
  );
}
