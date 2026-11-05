import { describe, expect, it } from "vitest";
import { RANKS as APP_RANKS } from "@/lib/authz";
import { buildSnapshot, diffMembers, parseDivisions, parseRoster, positionShrinkGuard, RANKS, removalGuard, type CurrentMember, type Rows } from "../../../supabase/functions/_shared/roster.ts";
import { runRosterSync, publicChanges, selectMode, type SyncDeps } from "../../../supabase/functions/_shared/roster-sync.ts";
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

describe("roster validation: identity and call signs", () => {
  it("rejects a malformed call sign on a filled slot but treats a placeholder on a vacant slot as none", () => {
    const bad = build(rosterRows({ extra: [["", "", "", "", "XX-9", "H. Bad", id(50), "", "Officer", "Patrol Bureau"]] }));
    expect(bad.ok).toBe(false);
    expect(bad.issues.map((i) => i.code)).toContain("invalid_callsign");
    const vacant = build(rosterRows({ extra: [["", "", "", "", "—", "", "", "", "Captain", "TBD Commander"]] }));
    expect(vacant.ok).toBe(true);
    expect(vacant.snapshot.positions.at(-1)?.callsign).toBeNull();
  });

  it("maps the exact Discord ID to the member and never matches by name", () => {
    const r = build();
    const f = r.snapshot.members.find((m) => m.name === "F. Officer")!;
    expect(f).toMatchObject({ discordId: id(6), callsign: "X-425", rank: "Officer", district: "North" });
    // The same name under a different ID is a different person, and is flagged.
    const twin = build(rosterRows({ extra: [["", "", "", "", "X-530", "F. Officer", id(77), "", "Officer", "Patrol Bureau"]] }));
    expect(twin.snapshot.members.filter((m) => m.name === "F. Officer")).toHaveLength(2);
    expect(twin.issues.map((i) => i.code)).toContain("duplicate_name");
  });

  it("rejects a read where nobody has a valid Discord ID", () => {
    const rows = rosterRows();
    for (const r of rows) if (typeof r[6] === "string" && /^9\d{17}$/.test(r[6])) r[6] = "";
    const r = build(rows);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain("no_members");
  });

  it("warns when a member holds more than three division slots (HB §9.3)", () => {
    const d = divisionRows();
    const extra = ["W-20", "W-21", "W-22", "W-23"].map((c) => ["", "", "", "", c, "F. Officer", id(6), "", "Officer", "Waterfront Unit", "", ""]);
    const r = build(rosterRows(), [...d, ...extra]);
    expect(r.issues.map((i) => i.code)).toContain("too_many_divisions");
    expect(r.ok).toBe(true);
  });
});

describe("incomplete imports", () => {
  it("rejects a read with far fewer positions than the last import unless command confirms", () => {
    expect(positionShrinkGuard(134, 40, false)?.code).toBe("positions_shrunk");
    expect(positionShrinkGuard(134, 40, true)).toBeNull();
    expect(positionShrinkGuard(134, 120, false)).toBeNull();
    expect(positionShrinkGuard(null, 5, false)).toBeNull();
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

describe("sync mode", () => {
  it("lets the first import be dry-run with the sync secret, and never applies by accident", () => {
    expect(selectMode(true, "preview")).toBe("preview");
    expect(selectMode(true, "apply")).toBe("apply");
    expect(selectMode(true, undefined)).toBe("apply"); // the scheduler body is {"mode":"apply"}
    expect(selectMode(false, undefined)).toBe("preview");
    expect(selectMode(false, "preview")).toBe("preview");
    expect(selectMode(false, "apply")).toBe("apply");
    expect(selectMode(false, "anything else")).toBe("preview");
  });
});

describe("sync orchestration", () => {
  const deps = (over: Partial<SyncDeps> = {}) => {
    const applied: unknown[] = [];
    const approvals: string[][] = [];
    const d: SyncDeps = {
      readSheets: async () => ({ roster: rosterRows(), divisions: divisionRows() }),
      loadCurrent: async () => [],
      lastAppliedHash: async () => null,
      lastPositionCount: async () => null,
      apply: async (s, approved) => {
        applied.push(s);
        approvals.push(approved);
        return { members: s.members.length, markedFormer: approved.length, pendingRemoval: 0 };
      },
      hash: async (s) => String(s.length),
      ...over,
    };
    return { d, applied, approvals };
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

  it("a truncated sheet is rejected before it can replace the last valid roster", async () => {
    const { d, applied } = deps({
      lastPositionCount: async () => 134,
      readSheets: async () => ({ roster: rosterRows(), divisions: divisionRows() }),
    });
    const r = await runRosterSync(d, "apply");
    expect(r.status).toBe("rejected");
    expect(r.issues.map((i) => i.code)).toContain("positions_shrunk");
    expect(applied).toHaveLength(0);
    const preview = await runRosterSync(d, "preview");
    expect((await runRosterSync(d, "apply", { confirmRemovals: true, expectedHash: preview.hash })).status).toBe("applied");
  });

  describe("removal approval", () => {
    const fewer = () => ({ readSheets: async () => ({ roster: rosterRows().slice(0, 12), divisions: divisionRows() }), loadCurrent: async () => current() });
    const stubbornDeps = () => deps({ ...fewer(), lastPositionCount: async () => null });

    it("approval is refused without the hash of a reviewed preview", async () => {
      const { d, applied } = stubbornDeps();
      const r = await runRosterSync(d, "apply", { confirmRemovals: true });
      expect(r.status).toBe("rejected");
      expect(r.issues.map((i) => i.code)).toContain("approval_stale");
      expect(applied).toHaveLength(0);
    });

    it("approval is refused when the sheet changed after the preview", async () => {
      const { d, applied } = stubbornDeps();
      const r = await runRosterSync(d, "apply", { confirmRemovals: true, expectedHash: "not-the-previewed-hash" });
      expect(r.status).toBe("rejected");
      expect(r.issues.map((i) => i.code)).toContain("approval_stale");
      expect(applied).toHaveLength(0);
    });

    it("an approved run passes exactly the removed Discord IDs to the database; an unapproved one passes none", async () => {
      const { d, approvals } = stubbornDeps();
      const preview = await runRosterSync(d, "preview");
      const removed = preview.changes.filter((c) => c.kind === "removed").map((c) => c.discordId);
      expect(removed.length).toBeGreaterThan(0);
      expect((await runRosterSync(d, "apply", { confirmRemovals: true, expectedHash: preview.hash })).status).toBe("applied");
      expect(approvals[0].sort()).toEqual(removed.sort());

      // A small, ordinary removal (below the mass-removal limit) applies without approval, but removes nobody at once.
      const small = deps({ loadCurrent: async () => [...current(), { discordId: id(99), name: "Gone", callsign: null, rank: "Officer", appointment: "x", district: null, status: "active" }] });
      const r = await runRosterSync(small.d, "apply");
      expect(r.status).toBe("applied");
      expect(small.approvals[0]).toEqual([]);
    });

    it("the scheduler path cannot approve removals, whatever the request says", async () => {
      // The edge function derives confirmRemovals from !scheduled; a scheduled run reaches runRosterSync with it false.
      const { d, applied } = stubbornDeps();
      const r = await runRosterSync(d, "apply", { confirmRemovals: false, expectedHash: "anything" });
      expect(r.status).toBe("rejected");
      expect(applied).toHaveLength(0);
    });

    it("reports what the database did with missing members", async () => {
      const { d } = deps({ apply: async () => ({ members: 7, markedFormer: 0, pendingRemoval: 2 }) });
      expect((await runRosterSync(d, "apply")).outcome).toEqual({ markedFormer: 0, pendingRemoval: 2 });
    });
  });

  it("a failure reading prior state fails the run without applying", async () => {
    const { d, applied } = deps({ lastPositionCount: async () => Promise.reject(new Error("database request failed (502)")) });
    expect((await runRosterSync(d, "apply")).status).toBe("failed");
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
