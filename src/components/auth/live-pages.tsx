"use client";

import { Page, PageHeader } from "@/components/shell/page";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Stat } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { can } from "@/lib/authz";
import { actorFor } from "@/lib/backend/membership";
import { POSITIONS } from "@/lib/department";
import { useMe } from "@/lib/preview/hooks";
import { allMembers } from "@/lib/preview/store";

/** Command Center for a verified Captain or above: roster-derived staffing only. The decision queue and compliance need patrol and request records. */
export function LiveCommand() {
  const me = useMe();
  const verified = useVerifiedMember();
  // UX only: the data below is read through RLS (is_command), so a lower rank gets no rows even if this check were bypassed.
  const allowed = !!verified && can(actorFor(verified), "command.view");
  const members = allMembers();
  if (!me || !verified) return null;
  if (!allowed)
    return (
      <Page>
        <div className="mx-auto mt-10 max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-sm">
          <h1 className="display text-xl font-bold">Command Center is restricted</h1>
          <p className="mt-2 text-xs text-muted">Access: Captain and above (interim rule pending leadership, PC-08). Your rank is {verified.rank}. The same rule is enforced by the database, not only by this page.</p>
          <ButtonLink href="/hq" variant="secondary" className="mt-5">
            Back to overview
          </ButtonLink>
        </div>
      </Page>
    );
  return (
    <Page wide>
      <PageHeader
        eyebrow="Command"
        title="Command Center"
        description="Roster-derived staffing. Patrol compliance and the decision queue arrive with their server-side records."
        actions={
          <ButtonLink href="/hq/command/integrations" variant="secondary">
            Integrations
          </ButtonLink>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active personnel" value={members.length} sub="on the synced roster" />
        <Stat label="Sworn positions" value={POSITIONS.length} sub="authorized" />
        <Stat label="North District" value={members.filter((m) => m.district === "North").length} sub="members" />
        <Stat label="South District" value={members.filter((m) => m.district === "South").length} sub="members" />
      </div>
      <Callout tone="info" title="Compliance and decisions are not connected yet">
        Weekly patrol compliance and request decisions need server-side patrol and request records. Nothing is estimated or shown from sample data.
      </Callout>
    </Page>
  );
}

export { LiveOverview } from "./live-overview";
export { LivePersonnel } from "./live-personnel";
