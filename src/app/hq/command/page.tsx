import { Suspense } from "react";
import { CommandCenter } from "@/components/command/command-center";

export const metadata = { title: "Command Center" };

export default function CommandPage() {
  return (
    <Suspense>
      <CommandCenter />
    </Suspense>
  );
}
