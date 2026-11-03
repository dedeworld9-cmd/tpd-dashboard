import { Suspense } from "react";
import { PersonnelWorkspace } from "@/components/personnel/personnel-workspace";

export const metadata = { title: "Personnel" };

export default function RosterPage() {
  return (
    <Suspense>
      <PersonnelWorkspace />
    </Suspense>
  );
}
