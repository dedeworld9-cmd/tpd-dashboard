import { afterEach, describe, expect, it, vi } from "vitest";
import { notConnectedArea } from "@/components/auth/live-gate";
import { buildLiveRoster, type DirectoryRow } from "@/lib/backend/live-roster";
import { parseMembership, actorFor, type VerifiedMember } from "@/lib/backend/membership";
import { can } from "@/lib/authz";
import {
  allMembers,
  clearLiveRoster,
  currentMember,
  getPreviewState,
  isLiveRoster,
  LIVE_UNAVAILABLE,
  memberById,
  patrol,
  personnel,
  requests,
  resetPreview,
  setLiveRoster,
  setRole,
} from "@/lib/preview/store";
import { MEMBERS } from "@/lib/sample-data";

const ME_ID = "11111111-1111-4111-8111-111111111111";
const me = (over: Partial<VerifiedMember> = {}): VerifiedMember => ({
  id: ME_ID,
  name: "Real Member",
  callsign: "X-425",
  rank: "Officer",
  appointment: "Patrol Bureau",
  tier: "Patrol Bureau",
  district: "North",
  timezone: "EST",
  status: "active",
  divisions: [{ division: "waterfront", callsign: "W-12", role: "Officer", title: "Waterfront Unit" }],
  ...over,
});
const row = (id: string, name: string, rank: string, over: Partial<DirectoryRow> = {}): DirectoryRow => ({ id, name, callsign: null, rank, appointment: "Patrol Bureau", tier: "Patrol Bureau", district: "South", status: "active", ...over });
const directory = [
  row(ME_ID, "Real Member", "Officer", { callsign: "X-425", district: "North" }),
  row("22222222-2222-4222-8222-222222222222", "Real Captain", "Captain", { callsign: "X-309", district: null }),
  row("33333333-3333-4333-8333-333333333333", "Odd Rank", "Sheriff"),
  row("44444444-4444-4444-8444-444444444444", "Gone", "Officer", { status: "former" }),
];

afterEach(() => clearLiveRoster());

describe("live roster mapping", () => {
  it("builds members from the directory, dropping unknown ranks and non-active rows, and never invents patrol figures", () => {
    const r = buildLiveRoster(me(), directory, [{ personnel_id: "22222222-2222-4222-8222-222222222222", division_slug: "waterfront" }]);
    expect(r.members.map((m) => m.name).sort()).toEqual(["Real Captain", "Real Member"]);
    const cap = r.members.find((m) => m.name === "Real Captain")!;
    expect(cap).toMatchObject({ district: "Department", divisions: ["Waterfront Unit"], weekMinutes: 0, onDuty: false });
    expect(r.me.id).toBe(ME_ID);
    expect(r.members.filter((m) => m.id === ME_ID)).toHaveLength(1);
    expect(r.me.timezone).toBe("EST");
  });

  it("carries no Discord IDs", () => {
    expect(JSON.stringify(buildLiveRoster(me(), directory, []))).not.toMatch(/\d{17,20}/);
  });

  it("still lists the signed-in member if the directory read raced a roster change", () => {
    expect(buildLiveRoster(me(), [], []).members.map((m) => m.id)).toEqual([ME_ID]);
  });

  it("marks a probationary officer so patrol eligibility follows the roster rank", () => {
    const r = buildLiveRoster(me({ rank: "Probationary Officer" }), directory, []);
    expect(r.me.status).toBe("Probationary");
    expect(can(actorFor(me({ rank: "Probationary Officer" })), "patrol.start")).toBe(false);
  });
});

describe("demo isolation in live mode", () => {
  const live = () => setLiveRoster(buildLiveRoster(me(), directory, []));

  it("replaces every demo persona, session and request", () => {
    resetPreview();
    expect(allMembers().map((m) => m.name)).toContain(MEMBERS[0].name);
    live();
    expect(isLiveRoster()).toBe(true);
    for (const m of MEMBERS) expect(memberById(m.id)).toBeUndefined();
    expect(allMembers().map((m) => m.name)).not.toEqual(expect.arrayContaining(MEMBERS.map((m) => m.name)));
    expect(currentMember(getPreviewState()).id).toBe(ME_ID);
    expect(getPreviewState()).toMatchObject({ sessions: [], requests: [], audit: [] });
  });

  it("ignores demo role switching", () => {
    live();
    setRole("command");
    expect(currentMember(getPreviewState()).id).toBe(ME_ID);
    expect(getPreviewState().role).toBe("officer");
  });

  it("refuses every mutation instead of saving into the browser", async () => {
    live();
    await expect(patrol.start("North")).rejects.toThrow(LIVE_UNAVAILABLE);
    await expect(requests.create("Leave of absence", "summary", "details long enough")).rejects.toThrow(LIVE_UNAVAILABLE);
    await expect(requests.decide("REQ-1", "Approved", "because", 1)).rejects.toThrow(LIVE_UNAVAILABLE);
    await expect(personnel.change(ME_ID, { rank: "Captain" }, "self promotion")).rejects.toThrow(LIVE_UNAVAILABLE);
    expect(getPreviewState().sessions).toHaveLength(0);
  });

  it("never writes to browser storage", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem, removeItem: () => {} });
    try {
      live();
      setRole("command");
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not fall back to demo personas after sign-out", () => {
    live();
    clearLiveRoster();
    expect(isLiveRoster()).toBe(false);
    expect(getPreviewState().sessions).toHaveLength(0);
  });
});

describe("membership answers", () => {
  it("accepts a well-formed verified answer and rejects malformed ones as unavailable, never as verified", () => {
    expect(parseMembership({ state: "verified", member: me() }).state).toBe("verified");
    expect(parseMembership({ state: "verified", member: { ...me(), rank: "Sheriff" } }).state).toBe("unavailable");
    expect(parseMembership({ state: "verified", member: { ...me(), id: undefined } }).state).toBe("unavailable");
    expect(parseMembership({ state: "verified" }).state).toBe("unavailable");
    expect(parseMembership({ state: "admin" }).state).toBe("unavailable");
    expect(parseMembership(null).state).toBe("unavailable");
    for (const s of ["signed_out", "unrecognized", "former", "inactive", "pending_verification", "unavailable"]) expect(parseMembership({ state: s }).state).toBe(s);
  });

  it("grants Command Center only from the verified roster rank (interim PC-08: Captain and above)", () => {
    expect(can(actorFor(me({ rank: "Officer" })), "command.view")).toBe(false);
    expect(can(actorFor(me({ rank: "Lieutenant" })), "command.view")).toBe(false);
    expect(can(actorFor(me({ rank: "Captain" })), "command.view")).toBe(true);
    expect(can(actorFor(me({ rank: "Chief of Police" })), "command.view")).toBe(true);
  });
});

describe("workspaces with no server record", () => {
  it("are closed in live mode", () => {
    for (const p of ["/hq/training", "/hq/requests", "/hq/supervisor"]) expect(notConnectedArea(p)).toBeTruthy();
    for (const p of ["/hq/patrol", "/hq/patrol/", "/hq/activity", "/hq/activity/"]) expect(notConnectedArea(p)).toBeNull();
    for (const p of ["/hq", "/hq/roster", "/hq/structure", "/hq/divisions/swat", "/hq/resources", "/hq/command", "/hq/command/integrations", "/hq/settings"]) expect(notConnectedArea(p)).toBeNull();
  });
});
