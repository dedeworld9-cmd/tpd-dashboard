"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HourMeter, formatMinutes } from "./hour-meter";
import { cn } from "@/lib/cn";

type Assignment = "North" | "South";

/**
 * DESIGN PREVIEW of the one-click patrol control. In this milestone the timer
 * runs in the browser only and nothing is recorded. Milestone 3 replaces the
 * local state with the server-recorded session (see docs/ARCHITECTURE.md).
 */
export function PatrolConsole({ weekMinutes, homeDistrict }: { weekMinutes: number; homeDistrict: Assignment }) {
  const [district, setDistrict] = useState<Assignment>(homeDistrict);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [lastSession, setLastSession] = useState<number | null>(null);

  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const liveMinutes = weekMinutes + Math.floor(elapsed / 60) + (lastSession ?? 0);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center px-5 py-10 text-center sm:py-14">
        {startedAt ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-green">
              <span aria-hidden className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green" />
              </span>
              On patrol · {district} District
            </p>
            <p className="mt-4 text-[clamp(3rem,10vw,5.5rem)] font-semibold leading-none tracking-tight text-ink tabular" role="timer" aria-live="off" aria-label="Elapsed patrol time">
              {clock(elapsed)}
            </p>
            <p className="mt-3 text-sm text-muted">Started {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                variant="danger"
                size="lg"
                onClick={() => {
                  setLastSession((l) => (l ?? 0) + Math.floor(elapsed / 60));
                  setStartedAt(null);
                }}
              >
                <Square aria-hidden className="size-4 fill-current" />
                End patrol
              </Button>
              <Button variant="secondary" size="lg" disabled title="The AnchorCAD link has not been configured yet">
                <ExternalLink aria-hidden className="size-4" />
                Open AnchorCAD
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted">You are off duty</p>
            <fieldset className="mt-6">
              <legend className="sr-only">Patrol district</legend>
              <div className="inline-flex rounded-md border border-line bg-sunken p-1">
                {(["North", "South"] as const).map((d) => (
                  <label
                    key={d}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-[5px] px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                      district === d ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                    )}
                  >
                    <input type="radio" name="district" value={d} checked={district === d} onChange={() => setDistrict(d)} className="sr-only" />
                    <MapPin aria-hidden className="size-4" />
                    {d} District
                  </label>
                ))}
              </div>
            </fieldset>
            <Button size="lg" className="mt-6 h-14 min-w-56 text-base" onClick={() => setStartedAt(Date.now())}>
              Start patrol
            </Button>
            <p className="mt-3 max-w-sm text-xs text-muted">
              Preview only: this timer runs in your browser and nothing is recorded. The live version keeps time on the
              server, so a refresh or closed tab will not lose a session.
            </p>
          </>
        )}
      </div>
      <div className="border-t border-line px-5 py-5 sm:px-6">
        <div className="mb-3 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-ink">This week</span>
          <span className="text-muted tabular">
            {formatMinutes(liveMinutes)} of 3h
          </span>
        </div>
        <HourMeter minutes={liveMinutes} />
      </div>
    </div>
  );
}

function clock(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
