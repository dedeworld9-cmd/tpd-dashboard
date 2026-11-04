"use client";

import { BadgeCheck, LogIn } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Pill } from "@/components/ui/status";
import { Card, CardHeader } from "@/components/ui/surface";
import { useAuth } from "@/lib/backend/auth";
import { STATE_COPY, summary } from "@/lib/backend/membership";

/**
 * The signed-in member's verified roster record. Renders nothing in the
 * design preview (no backend), so demo personas are never mixed with real data.
 */
export function VerifiedIdentity() {
  const auth = useAuth();
  if (auth.status === "disabled") return null;
  if (auth.status === "loading") return null;
  const m = auth.membership;
  if (!m || m.state === "signed_out")
    return (
      <Callout
        tone="info"
        title="Sign in to see your verified record"
        action={
          <Button size="sm" variant="gold" icon={<LogIn />} onClick={auth.signIn}>
            Sign in with Discord
          </Button>
        }
      >
        The figures below are demo personas until you sign in.
      </Callout>
    );
  if (m.state !== "verified" || !m.member)
    return (
      <Callout
        tone={m.state === "unavailable" ? "error" : "warn"}
        title={STATE_COPY[m.state].title}
        action={
          <ButtonLink href="/hq/sign-in" size="sm" variant="secondary">
            Details
          </ButtonLink>
        }
      >
        {STATE_COPY[m.state].body}
      </Callout>
    );
  const me = m.member;
  const s = summary(me);
  const rows: [string, React.ReactNode][] = [
    ["Rank", me.rank],
    ["Call sign", me.callsign ?? "None assigned"],
    ["District", me.district ?? "Department-wide"],
    ["Appointment", me.appointment || "—"],
    ["Divisions", s.divisions.length ? s.divisions.map((d) => `${d.name} (${d.callsign}, ${d.role})`).join(" · ") : "None"],
    ["Authorized fleet", s.fleet.join(", ") || "None"],
    ["Access", s.capabilities.length ? s.capabilities.join(" · ") : "Member access"],
  ];
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <BadgeCheck aria-hidden className="size-4 text-green" /> {me.name}
          </span>
        }
        description={`Verified against the official roster${m.last_sync_at ? ` · roster synced ${new Date(m.last_sync_at).toLocaleString()}` : ""}`}
        action={<Pill tone="green">Verified</Pill>}
      />
      <dl className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-2.5">
            <dt className="text-3xs text-muted">{k}</dt>
            <dd className="mt-0.5 text-xs font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
