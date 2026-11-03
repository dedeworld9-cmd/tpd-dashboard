"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/feedback";
import { can } from "@/lib/authz";
import { formatMinutes, weekMinutes, formatTime } from "@/lib/domain/activity";
import { useMe, useNow } from "@/lib/preview/hooks";
import { OperationError, patrol, usePreviewState, type PatrolDistrict, type SessionRecord } from "@/lib/preview/store";

/**
 * Patrol lifecycle shared by the dashboard, patrol console, sidebar and
 * command palette. Phases map to the five console states:
 *   idle (off duty) → starting → on duty → ending → idle, plus recovering
 *   when the app loads and finds an open session.
 */
export type PatrolPhase = "loading" | "idle" | "starting" | "recovering" | "on-duty" | "ending";

interface PatrolApi {
  phase: PatrolPhase;
  canStart: boolean;
  start: (district: PatrolDistrict) => Promise<void>;
  requestEnd: () => void;
}

const Ctx = createContext<PatrolApi | null>(null);

export function usePatrol() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePatrol must be used inside PatrolProvider");
  return v;
}

export function PatrolProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const state = usePreviewState();
  const [busy, setBusy] = useState<"starting" | "ending" | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const checked = useRef(false);
  const now = useNow(1000, confirmOpen);

  // Session recovery: an open session found on first load (refresh, closed tab, reconnect).
  const recoveredFrom = useRef<SessionRecord | null>(null);
  useEffect(() => {
    if (!me || checked.current) return;
    checked.current = true;
    if (me.session) {
      recoveredFrom.current = me.session;
      setRecovering(true);
    }
  }, [me]);

  useEffect(() => {
    if (!recovering) return;
    const t = setTimeout(() => {
      setRecovering(false);
      const s = recoveredFrom.current;
      if (s) toast("info", "Patrol recovered", `Your ${s.district} District session from ${formatTime(s.start)} is still running.`);
    }, 900);
    return () => clearTimeout(t);
  }, [recovering]);

  const phase: PatrolPhase = !me ? "loading" : busy ? busy : recovering ? "recovering" : me.session ? "on-duty" : "idle";

  const start = useCallback(async (district: PatrolDistrict) => {
    if (busy) return;
    setBusy("starting");
    try {
      const s = await patrol.start(district);
      toast("success", "Patrol started", `${s.district} District · ${formatTime(s.start)}`);
    } catch (e) {
      if (!(e instanceof OperationError && e.message === "Already in progress")) {
        toast("error", "Patrol not started", e instanceof Error ? e.message : "Try again.");
      }
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const confirmEnd = useCallback(async () => {
    if (busy) return;
    setBusy("ending");
    try {
      const s = await patrol.end();
      setConfirmOpen(false);
      const mins = Math.floor(((s.end ?? Date.now()) - s.start) / 60000);
      toast(
        s.flag === "Needs review" ? "info" : "success",
        s.flag === "Needs review" ? "Patrol ended and flagged for review" : "Patrol ended",
        s.flag === "Needs review" ? "The session ran past 12 hours, so it was capped and sent to your supervisor." : `${formatMinutes(mins)} added to this week.`,
      );
    } catch (e) {
      toast("error", "Patrol not ended", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const elapsedMin = me?.session && now ? Math.floor((now - me.session.start) / 60000) : 0;
  const week = state && me ? weekMinutes(state.sessions.filter((x) => x.memberId === me.member.id && x.end).map((x) => ({ start: x.start, end: x.end! })), new Date()) : 0;

  return (
    <Ctx.Provider value={{ phase, canStart: me ? can(me.actor, "patrol.start") : false, start, requestEnd: () => setConfirmOpen(true) }}>
      {children}
      <Dialog
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        title="End patrol?"
        description="Your end time is recorded now. Corrections later need a reason and a reviewer (Handbook §6)."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy === "ending"}>
              Keep patrolling
            </Button>
            <Button variant="danger" onClick={confirmEnd} loading={busy === "ending"}>
              {busy === "ending" ? "Ending…" : "End patrol"}
            </Button>
          </>
        }
      >
        {me?.session ? (
          <dl className="grid grid-cols-3 gap-3 rounded-lg bg-surface-2 p-3 ring-1 ring-inset ring-line">
            <div>
              <dt className="text-3xs text-muted">District</dt>
              <dd className="text-xs font-semibold">{me.session.district}</dd>
            </div>
            <div>
              <dt className="text-3xs text-muted">This session</dt>
              <dd className="text-xs font-semibold tabular">{formatMinutes(elapsedMin)}</dd>
            </div>
            <div>
              <dt className="text-3xs text-muted">Week after</dt>
              <dd className="text-xs font-semibold tabular">{formatMinutes(week + elapsedMin)}</dd>
            </div>
          </dl>
        ) : null}
      </Dialog>
    </Ctx.Provider>
  );
}
