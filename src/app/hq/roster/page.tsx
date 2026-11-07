import { Suspense } from "react";
import { LiveSwitch } from "@/components/auth/live-gate";
import { LivePersonnel } from "@/components/auth/live-pages";
import { PersonnelWorkspace } from "@/components/personnel/personnel-workspace";

export const metadata = { title: "Personnel" };

export default function RosterPage() {
  return (
    <Suspense>
      <LiveSwitch demo={<PersonnelWorkspace />} live={<LivePersonnel />} />
    </Suspense>
  );
}
