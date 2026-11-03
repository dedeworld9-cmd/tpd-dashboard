import { PageHeader } from "@/components/hq/page-header";
import { RequestCenter } from "@/components/hq/request-center";
import { REQUESTS } from "@/lib/sample-data";

export const metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <>
      <PageHeader
        title="Requests"
        description="Leave, corrections, transfers, applications and ride-alongs. Every request is decided by a person; none are approved automatically."
      />
      <RequestCenter requests={REQUESTS} />
    </>
  );
}
