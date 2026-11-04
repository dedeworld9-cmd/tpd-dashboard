import { RANKS, type Actor, type Capability, type Rank, can } from "@/lib/authz";
import { DIVISIONS, VEHICLES, vehicleAuthorized } from "@/lib/department";

export type MembershipState = "signed_out" | "verified" | "unrecognized" | "former" | "inactive" | "pending_verification" | "unavailable";

export interface VerifiedMember {
  name: string;
  callsign: string | null;
  rank: Rank;
  appointment: string;
  tier: string;
  district: "North" | "South" | null;
  timezone: string | null;
  status: string;
  divisions: { division: string; callsign: string; role: string; title: string }[];
}

export interface Membership {
  state: MembershipState;
  reason?: string;
  last_sync_at?: string;
  member?: VerifiedMember;
}

/** Validates the server's answer; anything unexpected is treated as unavailable, never as verified. */
export function parseMembership(raw: unknown): Membership {
  const r = raw as Membership | null;
  const states: MembershipState[] = ["signed_out", "verified", "unrecognized", "former", "inactive", "pending_verification", "unavailable"];
  if (!r || typeof r !== "object" || !states.includes(r.state)) return { state: "unavailable", reason: "unexpected_response" };
  if (r.state === "verified" && (!r.member || !(RANKS as readonly string[]).includes(r.member.rank))) return { state: "unavailable", reason: "unexpected_response" };
  return r;
}

export const STATE_COPY: Record<MembershipState, { title: string; body: string }> = {
  signed_out: { title: "Signed out", body: "Sign in with Discord to see your verified department record." },
  verified: { title: "Verified TPD member", body: "Your Discord account matches an active entry on the official roster." },
  unrecognized: {
    title: "Not on the roster",
    body: "You signed in, but your Discord account is not listed on the official TPD roster. If you were recently hired, ask your chain of command to add your Discord user ID to the roster; the site updates after the next roster sync.",
  },
  former: { title: "No longer on the roster", body: "Your Discord account was on the TPD roster but is not listed any more, so department access is closed." },
  inactive: { title: "Access paused", body: "Your roster record is not active. Department access is paused until command restores it." },
  pending_verification: { title: "Verification pending", body: "Your sign-in has no Discord identity attached, so it cannot be matched to the roster. Sign out and sign in again with Discord." },
  unavailable: { title: "Verification unavailable", body: "The roster could not be checked right now. No access has been granted. Try again shortly." },
};

/** The authorization actor for a verified member. Patrol approval comes from the roster rank until training records exist (M5). */
export function actorFor(m: VerifiedMember): Actor {
  return { rank: m.rank, status: "Active", independentPatrolApprovedAt: m.rank === "Probationary Officer" ? null : "roster" };
}

const SHOWN: { cap: Capability; label: string }[] = [
  { cap: "patrol.start", label: "Start patrol" },
  { cap: "supervisor.view", label: "Supervisor desk" },
  { cap: "request.review", label: "Review requests" },
  { cap: "discipline.issue", label: "Issue formal discipline (HB §13.1)" },
  { cap: "command.view", label: "Command Center" },
  { cap: "training.approve_independent", label: "Approve independent patrol" },
];

export function summary(m: VerifiedMember) {
  const actor = actorFor(m);
  return {
    capabilities: SHOWN.filter((s) => can(actor, s.cap)).map((s) => s.label),
    fleet: VEHICLES.filter((v) => vehicleAuthorized(m.rank, v)).map((v) => v.name),
    divisions: m.divisions.map((d) => ({ ...d, name: DIVISIONS.find((x) => x.slug === d.division)?.name ?? d.division })),
  };
}
