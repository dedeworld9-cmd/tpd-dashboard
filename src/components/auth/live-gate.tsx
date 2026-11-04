"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SignInScreen } from "@/components/auth/sign-in";
import { Page, PageHeader } from "@/components/shell/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Callout, Skeleton } from "@/components/ui/feedback";
import { useAuth } from "@/lib/backend/auth";
import { supabase } from "@/lib/backend/client";
import { loadLiveRoster } from "@/lib/backend/live-roster";
import type { VerifiedMember } from "@/lib/backend/membership";
import { clearLiveRoster, setLiveRoster } from "@/lib/preview/store";

/** Routes that have no server-side record yet. They stay closed in live mode instead of saving into the browser. */
const NOT_CONNECTED: { prefix: string; label: string }[] = [
  { prefix: "/hq/patrol", label: "Patrol" },
  { prefix: "/hq/activity", label: "Activity" },
  { prefix: "/hq/training", label: "Training" },
  { prefix: "/hq/requests", label: "Requests" },
  { prefix: "/hq/supervisor", label: "Supervisor desk" },
];

export function notConnectedArea(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  return NOT_CONNECTED.find((r) => p === r.prefix || p.startsWith(`${r.prefix}/`))?.label ?? null;
}

const identityKey = (m: VerifiedMember) => JSON.stringify([m.id, m.name, m.callsign, m.rank, m.district, m.appointment, m.divisions.map((d) => d.division).sort()]);

function Bare({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="min-h-dvh bg-bg outline-none">
      {children}
    </main>
  );
}

/**
 * The HQ is available only to a verified roster member. Without a backend (the labelled design preview) it renders as before.
 * With one, nothing in the HQ renders until sign-in, roster verification and the real directory have all succeeded, and any
 * failure closes the HQ: there is no fallback to demo personas.
 */
export function LiveGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const verified = auth.membership?.state === "verified" ? (auth.membership.member ?? null) : null;
  const key = verified ? identityKey(verified) : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (auth.status === "disabled") return;
    if (!verified || !key) {
      if (auth.status === "ready") clearLiveRoster();
      setLoaded(null);
      return;
    }
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    setFailed(false);
    loadLiveRoster(sb as unknown as Parameters<typeof loadLiveRoster>[0], verified)
      .then((roster) => {
        if (!alive) return;
        setLiveRoster(roster); // before "ready", so no child ever renders against demo data
        setLoaded(key);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // `verified` is represented by `key`; re-running on every identical re-read would flash the loading state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, key, attempt]);

  if (auth.status === "disabled") return <>{children}</>;
  if (auth.status === "loading")
    return (
      <Bare>
        <Page>
          <p role="status" className="mt-16 text-center text-xs text-muted">
            Checking your session…
          </p>
        </Page>
      </Bare>
    );
  if (!verified) {
    const authRoute = pathname.includes("/hq/sign-in") || pathname.includes("/hq/auth/callback");
    return <Bare>{authRoute ? children : <SignInScreen />}</Bare>;
  }
  if (failed)
    return (
      <Bare>
        <Page>
          <div className="mx-auto mt-16 max-w-md">
            <Callout tone="error" title="The roster could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>}>
              Headquarters stays closed until your verified record and the directory load. No sample data is shown instead.
            </Callout>
          </div>
        </Page>
      </Bare>
    );
  if (loaded !== key)
    return (
      <Bare>
        <Page>
          <div role="status" aria-label="Loading the roster" className="mx-auto mt-16 max-w-md space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </Page>
      </Bare>
    );
  return <>{children}</>;
}

/** Shown in place of a workspace that has no server-side record yet. */
export function NotConnected({ area }: { area: string }) {
  return (
    <Page>
      <PageHeader eyebrow="Headquarters" title={`${area} is not connected yet`} description="This workspace needs a server-side record that has not been built, so it is closed instead of saving into your browser." />
      <Callout tone="info" title="Nothing here is recorded or counted yet">
        Patrol time, requests, training progress and activity totals are not stored anywhere official, so none are shown. Your verified identity, the personnel directory, department structure, divisions and resources are live.
      </Callout>
      <div className="mt-5 flex gap-2">
        <ButtonLink href="/hq" variant="secondary">
          Back to overview
        </ButtonLink>
        <Link href="/hq/roster" className="inline-flex h-9 items-center px-2 text-xs font-semibold text-gold-ink hover:underline">
          Personnel directory
        </Link>
      </div>
    </Page>
  );
}

/** Picks the labelled design-preview screen or the verified live one. */
export function LiveSwitch({ demo, live }: { demo: ReactNode; live: ReactNode }) {
  return useAuth().status === "disabled" ? <>{demo}</> : <>{live}</>;
}
