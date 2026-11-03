import { Suspense } from "react";
import { RequestsWorkspace } from "@/components/requests/requests-workspace";

export const metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <Suspense>
      <RequestsWorkspace />
    </Suspense>
  );
}
