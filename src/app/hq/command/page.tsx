import { Suspense } from "react";
import { LiveSwitch } from "@/components/auth/live-gate";
import { LiveCommandReport } from "@/components/command/live-command-report";
import { CommandCenter } from "@/components/command/command-center";

export const metadata = { title: "Command Center" };

export default function CommandPage() {
  return (
    <Suspense>
      <LiveSwitch demo={<CommandCenter />} live={<LiveCommandReport />} />
    </Suspense>
  );
}
