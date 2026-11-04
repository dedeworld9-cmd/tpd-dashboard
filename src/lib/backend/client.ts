"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { backendConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

/** Browser client. PKCE code flow; the session is kept by Supabase Auth and refreshed before it expires. */
export function supabase(): SupabaseClient | null {
  if (!backendConfigured || typeof window === "undefined") return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "tpd-auth" },
  });
  return client;
}
