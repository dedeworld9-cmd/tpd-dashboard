import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPreviewState, memberById, notificationsFor, OperationError, patrol, personnel, requests, resetPreview, setRole } from "@/lib/preview/store";

async function settle<T>(p: Promise<T>) {
  const out = p.then((v) => ({ v }), (e) => ({ e }));
  await vi.advanceTimersByTimeAsync(600);
  const r = (await out) as { v?: T; e?: unknown };
  if ("e" in r) throw r.e;
  return r.v as T;
}

describe("preview store operations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPreview();
  });

  it("starts patrol idempotently and rejects double clicks", async () => {
    setRole("officer");
    const first = settle(patrol.start("North"));
    await expect(patrol.start("North")).rejects.toThrow("Already in progress");
    const s1 = await first;
    const s2 = await settle(patrol.start("South"));
    expect(s2.id).toBe(s1.id);
    const ended = await settle(patrol.end());
    expect(ended.end).not.toBeNull();
    await expect(settle(patrol.end())).rejects.toBeInstanceOf(OperationError);
  });

  it("caps sessions over 12 hours and flags them for review", async () => {
    setRole("officer");
    await settle(patrol.start("North"));
    vi.setSystemTime(Date.now() + 13 * 3600_000);
    const ended = await settle(patrol.end());
    expect(ended.flag).toBe("Needs review");
    expect(ended.end! - ended.start).toBe(12 * 3600_000);
  });

  it("refuses patrol for probationary officers (HB §3.1)", async () => {
    setRole("probationary");
    await expect(settle(patrol.start("North"))).rejects.toThrow(/Independent patrol/);
  });

  it("requires authorization and a reason to decide, and appends history", async () => {
    setRole("officer");
    await expect(settle(requests.decide("REQ-1049", "Approved", "Looks good to me"))).rejects.toThrow(/not authorized/);
    setRole("command");
    await expect(settle(requests.decide("REQ-1049", "Approved", "ok"))).rejects.toThrow(/reason/);
    expect(await settle(requests.decide("REQ-1049", "Approved", "Meets the subdivision limit."))).toBe("Approved");
    const r = getPreviewState().requests.find((x) => x.id === "REQ-1049")!;
    expect(r.history.at(-1)).toMatchObject({ action: "Approved", actor: "m-03", note: "Meets the subdivision limit." });
    await expect(settle(requests.decide("REQ-1049", "Denied", "Changed my mind"))).rejects.toThrow(/already approved/);
  });

  it("allows one pending correction per session", async () => {
    setRole("officer");
    const session = getPreviewState().sessions.find((s) => s.memberId === "m-07" && s.end !== null && !s.flag)!;
    await expect(settle(requests.createCorrection("PS-missing", "Game crashed early, please fix"))).rejects.toThrow(/own sessions/);
    await settle(requests.createCorrection(session.id, "Game crashed at 21:30, end time should be 21:30"));
    await expect(settle(requests.createCorrection(session.id, "Second attempt at the same fix"))).rejects.toThrow(/already pending/);
  });

  it("creates and withdraws member requests", async () => {
    setRole("officer");
    const created = await settle(requests.create("Leave of absence", "Exams", "Exams for ten days in a row"));
    expect(created.state).toBe("Submitted");
    await settle(requests.withdraw(created.id));
    await expect(settle(requests.withdraw(created.id))).rejects.toThrow(/already withdrawn/);
  });

  it("notifies a reviewer about requests they can decide, never their own", () => {
    setRole("supervisor");
    const n = notificationsFor(getPreviewState());
    expect(n.some((x) => x.id.startsWith("REQ-1047:queue"))).toBe(true);
    expect(n.some((x) => x.id.startsWith("REQ-1049:queue"))).toBe(false); // division application needs Lt+
  });
});

describe("personnel administration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPreview();
  });

  it("requires personnel.manage, a reason, and never self-service", async () => {
    setRole("supervisor");
    await expect(settle(personnel.change("m-09", { rank: "Corporal" }, "Good work all month"))).rejects.toThrow(/not authorized/);
    setRole("command");
    await expect(settle(personnel.change("m-03", { rank: "Captain" }, "Testing self change"))).rejects.toThrow(/own record/);
    await expect(settle(personnel.change("m-09", { rank: "Corporal" }, "ok"))).rejects.toThrow(/reason/);
    const entries = await settle(personnel.change("m-09", { rank: "Corporal" }, "Good work all month"));
    expect(entries[0]).toMatchObject({ action: "Promotion", from: "Officer", to: "Corporal" });
    expect(memberById("m-09")!.rank).toBe("Corporal");
  });

  it("enforces the three-subdivision limit and unique call signs", async () => {
    setRole("command");
    await expect(settle(personnel.change("m-08", { divisions: ["Waterfront Unit", "SWAT", "SWAT Two", "Fourth"] }, "Too many units"))).rejects.toThrow(/three subdivisions/);
    await expect(settle(personnel.change("m-08", { callsign: "X-401" }, "Swap call signs"))).rejects.toThrow(/already assigned/);
    await expect(settle(personnel.change("m-08", { callsign: "X-412" }, "Same as before"))).rejects.toThrow(/Nothing changed/);
  });
});

describe("security and concurrency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPreview();
  });

  it("refuses a decision on a stale record (concurrent reviewers)", async () => {
    setRole("command");
    const seen = getPreviewState().requests.find((x) => x.id === "REQ-1049")!.history.length;
    // Another reviewer acts first.
    await settle(requests.decide("REQ-1049", "Clarification requested", "Which unit and shift?"));
    await expect(settle(requests.decide("REQ-1049", "Approved", "Approving on the old view", seen))).rejects.toThrow(/changed since you opened it/);
    expect(await settle(requests.decide("REQ-1049", "Approved", "Reviewed the clarification.", seen + 1))).toBe("Approved");
  });

  it("refuses a decision on one's own request and on a decided request", async () => {
    setRole("command");
    const own = await settle(requests.create("Transfer", "To South", "Timezone fits South District better."));
    await expect(settle(requests.decide(own.id, "Approved", "Approving my own"))).rejects.toThrow(/not authorized/);
    await expect(settle(requests.decide("REQ-1042", "Denied", "Reversing an old decision"))).rejects.toThrow(/already approved/);
  });

  it("ignores manipulated payloads: unknown request, unknown decision target, other members' sessions", async () => {
    setRole("supervisor");
    await expect(settle(requests.decide("REQ-9999", "Approved", "Does not exist"))).rejects.toThrow(/no longer exists/);
    const other = getPreviewState().sessions.find((s) => s.memberId === "m-07" && s.end !== null)!;
    await expect(settle(requests.createCorrection(other.id, "Correcting someone else's session"))).rejects.toThrow(/own sessions/);
    await expect(settle(requests.withdraw("REQ-1047"))).rejects.toThrow(/own requests/);
  });

  it("supervisors cannot decide LOA extensions; officers cannot change personnel", async () => {
    setRole("supervisor");
    await expect(settle(requests.decide("REQ-1051", "Approved", "Extension is fine"))).rejects.toThrow(/not authorized/);
    setRole("officer");
    await expect(settle(personnel.change("m-09", { rank: "Sergeant" }, "Self-service promotion"))).rejects.toThrow(/not authorized/);
  });
});
