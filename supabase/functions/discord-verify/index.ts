/**
 * POST /functions/v1/discord-verify   body: { "discordToken": string }
 *
 * No bot. Called once by the browser right after Discord sign-in, with the
 * member's own short-lived Discord token (scopes identify + guilds.members.read).
 *   1. The Supabase session is validated, and its Discord identity is read from auth.identities.
 *   2. GET /users/@me must return that same Discord ID, so a token for another account is refused.
 *   3. GET /users/@me/guilds/{DISCORD_GUILD_ID}/member gives server membership and role IDs.
 * The result is compared with the roster and stored for review. The token is not stored or logged.
 * Nothing here changes website access or Discord roles.
 */

import { discordVerifyHandler } from "../_shared/fn-discord-verify.ts";

Deno.serve(discordVerifyHandler({ get: (k) => Deno.env.get(k) }));
