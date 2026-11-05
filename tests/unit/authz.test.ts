import { describe, expect, it } from "vitest";
import { atLeast, can, canDecide, type Actor, type Rank } from "@/lib/authz";

const actor = (rank: Rank, extra: Partial<Actor> = {}): Actor => ({ rank, status: "Active", independentPatrolApprovedAt: "2026-10-30", ...extra });

describe("can()", () => {
  it("blocks patrol until independent patrol is approved (HB §3.1)", () => {
    expect(can(actor("Officer"), "patrol.start")).toBe(true);
    expect(can(actor("Officer", { independentPatrolApprovedAt: null }), "patrol.start")).toBe(false);
    expect(can(actor("Probationary Officer"), "patrol.start")).toBe(false);
  });

  it("denies everything to suspended and separated members, even with grants", () => {
    expect(can(actor("Chief of Police", { status: "Suspended" }), "roster.view")).toBe(false);
    expect(can(actor("Officer", { status: "Separated", grants: ["command.view"] }), "command.view")).toBe(false);
  });

  it("applies explicit grants", () => {
    expect(can(actor("Sergeant"), "discipline.issue")).toBe(false);
    expect(can(actor("Sergeant", { grants: ["discipline.issue"] }), "discipline.issue")).toBe(true);
  });

  it("gates the Command Center at Captain (interim, PC-08)", () => {
    expect(can(actor("Lieutenant"), "command.view")).toBe(false);
    expect(can(actor("Captain"), "command.view")).toBe(true);
    expect(can(actor("Major"), "command.view")).toBe(true);
  });

  it("limits formal discipline to Lieutenant and above (HB §13.1)", () => {
    expect(can(actor("Sergeant"), "discipline.report")).toBe(true);
    expect(can(actor("Sergeant"), "discipline.issue")).toBe(false);
    expect(can(actor("Lieutenant"), "discipline.issue")).toBe(true);
  });

  it("treats Reserve Officer outside the seniority ladder", () => {
    expect(atLeast("Reserve Officer", "Officer")).toBe(false);
    expect(atLeast("Reserve Officer", "Probationary Officer")).toBe(true);
  });
});

describe("canDecide()", () => {
  it("never lets members decide their own requests", () => {
    expect(canDecide(actor("Chief of Police"), "Leave of absence", true)).toBe(false);
  });
  it("reserves LOA extensions for the Office of the Chiefs (HB §5.4)", () => {
    expect(canDecide(actor("Major"), "LOA extension", false)).toBe(false);
    expect(canDecide(actor("Assistant Chief"), "LOA extension", false)).toBe(true);
  });
  it("lets Sergeants decide ride-alongs (HB §12.1)", () => {
    expect(canDecide(actor("Sergeant"), "Ride-along", false)).toBe(true);
    expect(canDecide(actor("Corporal"), "Ride-along", false)).toBe(false);
  });
});
