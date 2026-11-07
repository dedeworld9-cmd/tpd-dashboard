import { describe, expect, it } from "vitest";
import type { VerifiedMember } from "@/lib/backend/membership";
import { facets, filterDirectory, isFiltered, NO_FILTER } from "@/lib/ux/directory";
import { agoLabel, nextAction, overviewGroup } from "@/lib/ux/overview";
import { highlight, PAGE_ALIASES, score } from "@/lib/ux/palette-search";
import { clearRecents, pushRecentPage, readRecents } from "@/lib/ux/recents";
import { PAGES } from "@/components/shell/nav-config";
import type { Member } from "@/lib/sample-data";

const vm = (rank: VerifiedMember["rank"]): VerifiedMember => ({ id: "x", name: "N", callsign: "X-1", rank, appointment: "", tier: "", district: "North", timezone: null, status: "active", divisions: [] });

describe("palette search", () => {
  it("requires every word and ranks label start > word start > substring > alias", () => {
    const a = { label: "Personnel", keywords: "roster" };
    expect(score(a, "pers")).toBeGreaterThan(score({ label: "Open personnel", keywords: "" }, "pers"));
    expect(score({ label: "Open personnel" }, "pers")).toBeGreaterThan(score({ label: "Unpersonable" }, "pers"));
    expect(score({ label: "Unpersonable" }, "pers")).toBeGreaterThan(score({ label: "Resources", keywords: "personnel files" }, "pers"));
    expect(score(a, "personnel zzz")).toBe(0);
    expect(score(a, "")).toBeGreaterThan(0);
  });
  it("finds pages by common alternate words", () => {
    const hit = (href: string, label: string, q: string) => score({ label, keywords: PAGE_ALIASES[href] }, q) > 0;
    expect(hit("/hq/roster", "Personnel", "directory")).toBe(true);
    expect(hit("/hq/resources", "Resources", "handbook")).toBe(true);
    expect(hit("/hq/command/integrations", "Integrations", "discord")).toBe(true);
    expect(hit("/hq/structure", "Structure", "vacancies")).toBe(true);
  });
  it("every alias key is a real page", () => {
    const hrefs = new Set(PAGES.map((p) => p.href));
    for (const k of Object.keys(PAGE_ALIASES)) expect(hrefs.has(k), k).toBe(true);
  });
  it("highlights matches case-insensitively and reassembles the original text", () => {
    const runs = highlight("Senior Officer", "off sen");
    expect(runs.map((r) => r.text).join("")).toBe("Senior Officer");
    expect(runs.filter((r) => r.hit).map((r) => r.text)).toEqual(["Sen", "Off"]);
    expect(highlight("abc", "")).toEqual([{ text: "abc", hit: false }]);
  });
  it("stays fast with thousands of commands", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ label: `Member ${i}`, keywords: "x" }));
    const t = performance.now();
    many.map((e) => score(e, "member 4999"));
    expect(performance.now() - t).toBeLessThan(200);
  });
});

describe("recents", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };
  const ok = (h: string) => h.startsWith("/hq");
  it("is scoped per member, de-duplicated, capped and path-validated", () => {
    const s = mem();
    for (const h of ["/hq/a", "/hq/b", "/hq/a", "/hq/c", "/hq/d", "/hq/e", "/hq/f", "/hq/g"]) pushRecentPage("u1", h, ok, s);
    pushRecentPage("u1", "https://evil.test", ok, s);
    expect(readRecents("u1", ok, s)).toEqual(["/hq/g", "/hq/f", "/hq/e", "/hq/d", "/hq/c", "/hq/a"]);
    expect(readRecents("u2", ok, s)).toEqual([]);
    clearRecents("u1", s);
    expect(readRecents("u1", ok, s)).toEqual([]);
  });
  it("ignores corrupt storage and drops entries that are no longer valid", () => {
    const s = mem();
    s.setItem("tpd-recents:u1", "{not json");
    expect(readRecents("u1", ok, s)).toEqual([]);
    s.setItem("tpd-recents:u1", JSON.stringify(["/hq/a", "javascript:alert(1)", 5]));
    expect(readRecents("u1", ok, s)).toEqual(["/hq/a"]);
  });
});

describe("overview role groups", () => {
  it("derives the group from capabilities, not from a new rank table", () => {
    expect(overviewGroup(vm("Chief of Police"))).toBe("command");
    expect(overviewGroup(vm("Captain"))).toBe("command");
    expect(overviewGroup(vm("Lieutenant"))).toBe("supervisor");
    expect(overviewGroup(vm("Sergeant"))).toBe("supervisor");
    expect(overviewGroup(vm("Officer"))).toBe("member");
    expect(overviewGroup(vm("Probationary Officer"))).toBe("new");
  });
  it("next actions point at pages that exist in live mode", () => {
    const hrefs = new Set(PAGES.map((p) => p.href));
    for (const r of ["Chief of Police", "Sergeant", "Officer", "Probationary Officer"] as const) {
      const a = nextAction(vm(r), "https://docs.google.com/x");
      expect(a.external || hrefs.has(a.href), r).toBe(true);
      expect(a.href).not.toMatch(/patrol|requests|training|activity|supervisor/);
    }
  });
  it("reports freshness honestly", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    expect(agoLabel(null, now)).toBe("never");
    expect(agoLabel("garbage", now)).toBe("unknown");
    expect(agoLabel("2026-11-07T11:55:00Z", now)).toBe("5 minutes ago");
    expect(agoLabel("2026-11-07T09:00:00Z", now)).toBe("3 hours ago");
  });
});

describe("directory filter", () => {
  const m = (id: string, name: string, rank: Member["rank"], district: Member["district"], divisions: string[] = []): Member => ({ id, name, callsign: `X-${id}`, rank, district, appointment: "Patrol", divisions, status: "Active", weekMinutes: 0, onDuty: false, timezone: "—" });
  const rows = [m("1", "Ana Cruz", "Captain", "North", ["SWAT"]), m("2", "Ben Hale", "Officer", "South"), m("3", "Cy Dunn", "Officer", "North", ["SWAT", "Waterfront Unit"])];
  it("combines filters and search words", () => {
    expect(filterDirectory(rows, { ...NO_FILTER, rank: "Officer" }).map((r) => r.id)).toEqual(["2", "3"]);
    expect(filterDirectory(rows, { ...NO_FILTER, rank: "Officer", district: "North" }).map((r) => r.id)).toEqual(["3"]);
    expect(filterDirectory(rows, { ...NO_FILTER, division: "SWAT" }).map((r) => r.id)).toEqual(["1", "3"]);
    expect(filterDirectory(rows, { ...NO_FILTER, q: "cruz capt" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterDirectory(rows, { ...NO_FILTER, q: "nobody" })).toEqual([]);
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ ...NO_FILTER, q: " " })).toBe(false);
  });
  it("offers only options that exist in the data", () => {
    const f = facets(rows);
    expect(f.ranks).toEqual(["Captain", "Officer"]);
    expect(f.districts).toEqual(["North", "South"]);
    expect(f.divisions).toEqual(["SWAT", "Waterfront Unit"]);
  });
});
