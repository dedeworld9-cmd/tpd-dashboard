import { can, type Capability } from "@/lib/authz";
import { actorFor, type VerifiedMember } from "@/lib/backend/membership";

export type OverviewGroup = "new" | "member" | "supervisor" | "command";

export interface NextAction {
  title: string;
  body: string;
  href: string;
  cta: string;
  external?: boolean;
}

/** Derived only from `can()` and the roster rank; no separate hierarchy is invented. UI emphasis only: the database enforces access. */
export function overviewGroup(m: VerifiedMember): OverviewGroup {
  const a = actorFor(m);
  if (can(a, "command.view")) return "command";
  if (can(a, "supervisor.view") || can(a, "request.review")) return "supervisor";
  if (m.rank === "Probationary Officer") return "new";
  return "member";
}

/** The one thing most worth doing first. Every destination exists in live mode. */
export function nextAction(m: VerifiedMember, handbookUrl: string): NextAction {
  switch (overviewGroup(m)) {
    case "command":
      return { title: "Check integrations", body: "Confirm the roster sync and Discord checks are healthy.", href: "/hq/command/integrations", cta: "Open integrations" };
    case "supervisor":
      return { title: "Find your team", body: "Look up members by rank, district or division.", href: "/hq/roster", cta: "Open personnel" };
    case "new":
      return { title: "Read the Personnel Handbook", body: "Start with the rules every member follows.", href: handbookUrl, cta: "Open handbook", external: true };
    default:
      return { title: "Find a member", body: "Look up call signs, ranks and divisions.", href: "/hq/roster", cta: "Open personnel" };
  }
}

export const CAPABILITY_LABEL: Partial<Record<Capability, string>> = {
  "supervisor.view": "Supervisor desk",
  "command.view": "Command Center",
  "request.review": "Review requests",
};

/** "Updated 5 minutes ago". Null input (never synced) is reported, not hidden. */
export function agoLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "unknown";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86400)} days ago`;
}
