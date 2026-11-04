"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./client";
import { authCallbackUrl, backendConfigured } from "./config";
import { parseMembership, type Membership } from "./membership";

type Status = "disabled" | "loading" | "ready";

interface AuthApi {
  /** disabled: no backend configured, so the HQ runs as the labelled design preview. */
  status: Status;
  session: Session | null;
  membership: Membership | null;
  error: string | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
  /** Calls an Edge Function with the current session token. */
  invoke<T = unknown>(fn: string, body?: Record<string, unknown>): Promise<T>;
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(backendConfigured ? "loading" : "disabled");
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: Session | null) => {
    const sb = supabase();
    if (!sb) return;
    setSession(s);
    if (!s) {
      setMembership({ state: "signed_out" });
      setStatus("ready");
      return;
    }
    const { data, error: e } = await sb.rpc("my_membership");
    if (e) {
      setMembership({ state: "unavailable", reason: "request_failed" });
      setError("The roster service could not be reached.");
    } else {
      setMembership(parseMembership(data));
      setError(null);
    }
    setStatus("ready");
  }, []);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (alive) load(data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      // A failed refresh ends the session; membership is re-read on every sign-in.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(s);
      else setSession(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const api = useMemo<AuthApi>(
    () => ({
      status,
      session,
      membership,
      error,
      async signIn() {
        const sb = supabase();
        if (!sb) return;
        const { error: e } = await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: authCallbackUrl(window.location.origin) } });
        if (e) setError("Discord sign-in could not start. Try again.");
      },
      async signOut() {
        await supabase()?.auth.signOut();
        setSession(null);
        setMembership({ state: "signed_out" });
      },
      async refresh() {
        const sb = supabase();
        if (sb) await load((await sb.auth.getSession()).data.session);
      },
      async invoke<T>(fn: string, body: Record<string, unknown> = {}) {
        const sb = supabase();
        if (!sb) throw new Error("Backend is not configured");
        const { data, error: e } = await sb.functions.invoke(fn, { body });
        if (e) {
          let message = e.message;
          try {
            const ctx = (e as { context?: Response }).context;
            if (ctx) message = (await ctx.json()).error ?? message;
          } catch {
            /* keep the generic message */
          }
          throw new Error(message);
        }
        return data as T;
      },
    }),
    [status, session, membership, error, load],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

/** The verified member, or null in every other state (including the design preview). */
export function useVerifiedMember() {
  const { membership } = useAuth();
  return membership?.state === "verified" ? membership.member! : null;
}
