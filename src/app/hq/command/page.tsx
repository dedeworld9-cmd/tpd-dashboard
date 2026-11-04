import { Suspense } from "react";
import { LiveSwitch } from "@/components/auth/live-gate";
import { LiveCommand } from "@/components/auth/live-pages";
import { CommandCenter } from "@/components/command/command-center";

export const metadata = { title: "Command Center" };

export default function CommandPage() {
  return (
    <Suspense>
      <LiveSwitch demo={<CommandCenter />} live={<LiveCommand />} />
    </Suspense>
  );
}
