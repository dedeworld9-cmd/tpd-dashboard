import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPreviewState, notificationsFor, OperationError, patrol, requests, resetPreview, setRole } from "@/lib/preview/store";

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
