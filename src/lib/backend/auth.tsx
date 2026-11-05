"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "./client";
import { authCallbackUrl, backendConfigured } from "./config";
import { parseMembership, type Membership } from "./membership";
import { USER_SCOPES } from "../../../supabase/functions/_shared/discord.ts";

type Status = "disabled" | "loading" | "ready";

interface AuthApi {
  /** disabled: no backend configured, so the HQ runs as the labelled design preview. */
  status: Status;
  session: Session | null;
  membership: Membership | null;
  error: string | null;
  /** Result of the Discord server check made with the member's own token at sign-in. */
  serverCheck: ServerCheck | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
  /** Calls an Edge Function with the current session token. */
  invoke<T = unknown>(fn: string, body?: Record<string, unknown>): Promise<T>;
}

export type ServerCheck = { state: "checking" } | { state: "done"; inGuild: boolean; onRoster: boolean } | { state: "failed"; message: string };

/** Scopes requested from Discord: identity plus read-only access to the member's own server membership. */
export const DISCORD_SCOPES = USER_SCOPES;

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(backendConfigured ? "loading" : "disabled");
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverCheck, setServerCheck] = useState<ServerCheck | null>(null);
  const sentToken = useRef<string | null>(null);

  // Right after the OAuth callback the session carries Discord's short-lived token.
  // It is sent once to discord-verify, which checks TPD server membership server-side.
  const verifyServer = useCallback(async (s: Session) => {
    const sb = supabase();
    const token = s.provider_token;
    // Only on the OAuth callback page: later page loads reuse a stored, possibly expired token.
    if (!sb || !token || sentToken.current === token || !window.location.pathname.includes("/hq/auth/callback")) return;
    sentToken.current = token;
    setServerCheck({ state: "checking" });
    const { data, error: e } = await sb.functions.invoke("discord-verify", { body: { discordToken: token } });
    if (e) {
      let message = "The Discord server check could not be completed.";
      try {
        const ctx = (e as { context?: Response }).context;
        if (ctx) message = (await ctx.json()).error ?? message;
      } catch {
        /* keep the generic message */
      }
      setServerCheck({ state: "failed", message });
    } else setServerCheck({ state: "done", inGuild: !!data?.inGuild, onRoster: !!data?.onRoster });
  }, []);

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
      // 401 / JWT errors mean the session is no longer valid (expired, revoked, user deleted): end it instead of showing a vague outage.
      const { status, code } = e as { status?: number; code?: string };
      if (status === 401 || code === "PGRST301" || code === "PGRST303" || /jwt/i.test(e.message ?? "")) {
        await sb.auth.signOut({ scope: "local" }).catch(() => {});
        setSession(null);
        setMembership({ state: "signed_out" });
        setError("Your session has ended. Sign in again.");
      } else {
        setMembership({ state: "unavailable", reason: "request_failed" });
        setError("The roster service could not be reached.");
      }
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
      if (!alive) return;
      load(data.session);
      if (data.session) void verifyServer(data.session);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      // A failed refresh ends the session; membership is re-read on every sign-in.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(s);
      if (event === "SIGNED_IN" && s) void verifyServer(s);
      else setSession(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load, verifyServer]);

  const api = useMemo<AuthApi>(
    () => ({
      status,
      session,
      membership,
      error,
      serverCheck,
      async signIn() {
        const sb = supabase();
        if (!sb) return;
        const { error: e } = await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: authCallbackUrl(window.location.origin), scopes: DISCORD_SCOPES } });
        if (e) setError("Discord sign-in could not start. Try again.");
      },
      async signOut() {
        await supabase()?.auth.signOut();
        setSession(null);
        setServerCheck(null);
        sentToken.current = null;
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
    [status, session, membership, error, serverCheck, load],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

/** True when a backend is configured: the HQ then shows only verified, server-backed identity and never demo personas. */
export function useIsLive(): boolean {
  return useAuth().status !== "disabled";
}

/** The verified member, or null in every other state (including the design preview). */
export function useVerifiedMember() {
  const { membership } = useAuth();
  return membership?.state === "verified" ? membership.member! : null;
}
