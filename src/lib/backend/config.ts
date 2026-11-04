/**
 * Public backend configuration. These values are designed to be public:
 * the Supabase project URL and its anon key only allow what row-level
 * security permits. Secrets (service role key, Discord client secret, bot
 * token, Google service account, AnchorCAD API key) live only in Supabase
 * Edge Function secrets and never appear in this bundle.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const backendConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

/** Where Discord (via Supabase Auth) returns the browser. Must be in Supabase Auth's redirect allow list. */
export function authCallbackUrl(origin: string) {
  return `${origin}${BASE_PATH}/hq/auth/callback/`;
}
