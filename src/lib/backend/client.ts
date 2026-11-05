"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { backendConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, "tpd", "tpd">;
let client: Client | null = null;

/** Browser client. PKCE code flow; the session is kept by Supabase Auth and refreshed before it expires. */
export function supabase(): Client | null {
  if (!backendConfigured || typeof window === "undefined") return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: "tpd" }, // TPD's own schema; the project's public schema belongs to another app
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "tpd-auth" },
  });
  return client;
}
