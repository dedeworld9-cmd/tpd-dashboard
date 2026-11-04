import { describe, expect, it } from "vitest";
import { RANKS as APP_RANKS } from "@/lib/authz";
import { buildSnapshot, diffMembers, parseDivisions, parseRoster, RANKS, removalGuard, type CurrentMember, type Rows } from "../../../supabase/functions/_shared/roster.ts";
import { runRosterSync, publicChanges, type SyncDeps } from "../../../supabase/functions/_shared/roster-sync.ts";
import { divisionRows, id, rosterRows } from "./fixtures";

const build = (r: Rows = rosterRows(), d: Rows = divisionRows()) => buildSnapshot(parseRoster(r), parseDivisions(d));
const current = (snap = build().snapshot): CurrentMember[] =>
  snap.members.map((m) => ({ discordId: m.discordId, name: m.name, callsign: m.callsign, rank: m.rank, appointment: m.appointment, district: m.district, status: "active" }));

describe("roster parser", () => {
  it("uses the same rank list as the app", () => expect([...RANKS]).toEqual([...APP_RANKS]));

  it("reads positions by header labels, keeps vacancies separate and never creates members from them", () => {
    const { snapshot, issues, ok } = build();
    expect(ok).toBe(true);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(snapshot.positions).toHaveLength(12);
    expect(snapshot.members).toHaveLength(7);
    expect(snapshot.positions.filter((p) => !p.discordId)).toHaveLength(5);
  });

  it("keeps Discord IDs as exact strings", () => {
    const { snapshot } = build();
    expect(snapshot.members[0].discordId).toBe(id(1));
    expect(typeof snapshot.members[0].discordId).toBe("string");
  });

  it("assigns tiers, districts and timezones from the sheet structure", () => {
    const m = Object.fromEntries(build().snapshot.members.map((x) => [x.callsign, x]));
    expect(m["X-101"]).toMatchObject({ tier: "Office of the Chiefs", district: null, timezone: "PST" });
    expect(m["X-309"].tier).toBe("Division Command");
    expect(m["X-401"]).toMatchObject({ tier: "Field Supervisory", district: "North" });
    expect(m["X-412"]).toMatchObject({ tier: "Patrol Bureau", district: "North" });
    expect(m["X-525"]).toMatchObject({ district: "South", timezone: null });
  });

  it("never reads the POINTS column", () => {
    expect(JSON.stringify(build().snapshot)).not.toMatch(/Points/);
  });

  it("survives inserted rows and moved columns", () => {
    const rows = rosterRows();
    rows.splice(9, 0, [], ["", "", "", "", "note: updated weekly"]);
    const shifted = rows.map((r) => ["", ...r]); // a new column A inserted
    const { snapshot, ok } = build(shifted);
    expect(ok).toBe(true);
    expect(snapshot.members.map((m) => m.callsign)).toContain("X-525");
  });

  it("maps division slots by call-sign prefix and links holders that are on the roster", () => {
    const { snapshot } = build();
    expect(snapshot.divisionSlots.map((s) => [s.callsign, s.division, s.discordId])).toEqual([
      ["W-01", "waterfront", id(3)],
      ["W-02", "waterfront", null],
      ["W-12", "waterfront", id(5)],
      ["A-01", "swat", null],
    ]);
  });
});

describe("roster validation", () => {
  it("rejects a duplicate Discord ID", () => {
    const r = build(rosterRows({ mutate: (rows) => (rows[rows.length - 1][6] = id(6)) }));
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("duplicate_discord_id");
  });

  it("rejects a duplicate call sign", () => {
    const r = build(rosterRows({ mutate: (rows) => (rows[rows.length - 1][4] = "X-425") }));
    expect(r.issues.map((i) => i.code)).toContain("duplicate_callsign");
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown rank and a malformed Discord ID", () => {
    const r = build(
      rosterRows({
        extra: [
          ["", "", "", "", "X-530", "H. Bad", "12345", "", "Sheriff", "Patrol Bureau"],
          ["", "", "", "", "X-531", "I. Bad", "1.23E+17", "", "Officer", "Patrol Bureau"],
        ],
      }),
    );
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["invalid_rank", "malformed_discord_id"]));
    expect(r.ok).toBe(false);
  });

  it("warns, without blocking, for a name with no Discord ID", () => {
    const r = build(rosterRows({ extra: [["", "", "", "", "X-530", "J. NoId", "", "", "Officer", "Patrol Bureau"]] }));
    expect(r.ok).toBe(true);
    expect(r.issues.find((i) => i.code === "missing_discord_id")?.severity).toBe("warning");
    expect(r.snapshot.members.find((m) => m.name === "J. NoId")).toBeUndefined();
  });

  it("rejects an empty or headerless read", () => {
    expect(build([]).ok).toBe(false);
    expect(build([["something else"]]).issues[0].code).toBe("header_missing");
    expect(build(rosterRows().slice(0, 8)).issues.map((i) => i.code)).toContain("no_positions");
  });

  it("warns when a division holder is not on the roster", () => {
    const d = divisionRows();
    d[12][6] = id(42);
    const r = build(rosterRows(), d);
    expect(r.issues.map((i) => i.code)).toContain("division_member_not_on_roster");
    expect(r.snapshot.divisionSlots.find((s) => s.callsign === "W-12")?.discordId).toBeNull();
  });
});

describe("change detection", () => {
  it("detects rank, call sign and district changes, new members and former members", () => {
    const before = current();
    const rows = rosterRows();
    const r425 = rows.findIndex((r) => r[4] === "X-425");
    rows[r425] = ["", "", "", "", "X-525", "F. Officer", id(6), "", "Corporal", "Patrol Aide", "", "PST"]; // promoted, moved south
    rows.splice(
      rows.findIndex((r) => r[4] === "X-525" && r[6] === id(7)),
      1,
    ); // G. South left
    rows.push(["", "", "", "", "X-544", "K. New", id(8), "", "Officer", "Patrol Bureau"]);
    const changes = diffMembers(before, build(rows).snapshot.members);
    const updated = changes.find((c) => c.kind === "updated");
    expect(updated && updated.kind === "updated" && updated.fields).toMatchObject({
      callsign: { from: "X-425", to: "X-525" },
      rank: { from: "Officer", to: "Corporal" },
      district: { from: "North", to: "South" },
    });
    expect(changes.filter((c) => c.kind === "added").map((c) => c.name)).toEqual(["K. New"]);
    expect(changes.filter((c) => c.kind === "removed").map((c) => c.name)).toEqual(["G. South"]);
  });

  it("treats a returning former member as added", () => {
    const before = current().map((m, i) => (i === 0 ? { ...m, status: "former" } : m));
    expect(diffMembers(before, build().snapshot.members).filter((c) => c.kind === "added")).toHaveLength(1);
  });

  it("blocks a sync that would remove many members unless command confirms", () => {
    const before = Array.from({ length: 20 }, (_, i) => ({ discordId: id(100 + i), name: `M${i}`, callsign: null, rank: "Officer", appointment: "", district: null, status: "active" }));
    const changes = diffMembers(before, []);
    expect(removalGuard(20, changes, false)?.code).toBe("mass_removal");
    expect(removalGuard(20, changes, true)).toBeNull();
    expect(removalGuard(20, changes.slice(0, 3), false)).toBeNull();
  });
});

describe("sync orchestration", () => {
  const deps = (over: Partial<SyncDeps> = {}) => {
    const applied: unknown[] = [];
    const d: SyncDeps = {
      readSheets: async () => ({ roster: rosterRows(), divisions: divisionRows() }),
      loadCurrent: async () => [],
      lastAppliedHash: async () => null,
      apply: async (s) => {
        applied.push(s);
        return { members: s.members.length, markedFormer: 0 };
      },
      hash: async (s) => String(s.length),
      ...over,
    };
    return { d, applied };
  };

  it("initial import applies all members", async () => {
    const { d, applied } = deps();
    const r = await runRosterSync(d, "apply");
    expect(r.status).toBe("applied");
    expect(r.counts).toMatchObject({ members: 7, positions: 12, vacant: 5, added: 7 });
    expect(applied).toHaveLength(1);
  });

  it("preview never applies", async () => {
    const { d, applied } = deps();
    expect((await runRosterSync(d, "preview")).status).toBe("preview");
    expect(applied).toHaveLength(0);
  });

  it("an unchanged sheet is recorded as no changes", async () => {
    const snap = build().snapshot;
    const { d, applied } = deps({ loadCurrent: async () => current(snap), lastAppliedHash: async () => String(JSON.stringify(snap).length) });
    expect((await runRosterSync(d, "apply")).status).toBe("no_changes");
    expect(applied).toHaveLength(0);
  });

  it("a Google failure (rate limit, outage) fails without touching data", async () => {
    const { d, applied } = deps({ readSheets: async () => Promise.reject(new Error("sheets.googleapis.com answered 429")) });
    const r = await runRosterSync(d, "apply");
    expect(r).toMatchObject({ status: "failed", error: "sheets.googleapis.com answered 429" });
    expect(applied).toHaveLength(0);
  });

  it("a partial response is rejected and the last snapshot stays", async () => {
    const before = current();
    const { d, applied } = deps({ readSheets: async () => ({ roster: rosterRows().slice(0, 12), divisions: divisionRows() }), loadCurrent: async () => before });
    const r = await runRosterSync(d, "apply");
    expect(r.status).toBe("rejected");
    expect(r.issues.map((i) => i.code)).toContain("mass_removal");
    expect(applied).toHaveLength(0);
  });

  it("validation errors reject the run", async () => {
    const { d, applied } = deps({ readSheets: async () => ({ roster: rosterRows({ mutate: (rows) => (rows[rows.length - 1][6] = id(6)) }), divisions: divisionRows() }) });
    expect((await runRosterSync(d, "apply")).status).toBe("rejected");
    expect(applied).toHaveLength(0);
  });

  it("a database failure during apply is reported as failed", async () => {
    const { d } = deps({ apply: async () => Promise.reject(new Error("database request failed (502)")) });
    expect((await runRosterSync(d, "apply")).status).toBe("failed");
  });

  it("changes sent to the browser carry no Discord IDs", async () => {
    const { d } = deps();
    const r = await runRosterSync(d, "preview");
    expect(JSON.stringify(publicChanges(r.changes))).not.toMatch(/\d{17,20}/);
  });
});
