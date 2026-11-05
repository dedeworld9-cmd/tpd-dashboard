/**
 * POST /functions/v1/integration-health   (command only)
 *
 * Runs a real, authenticated check of each integration and stores the result.
 * "connected" is recorded only after a successful authenticated round trip.
 * Secret values are never returned; only whether each one is configured.
 */

import { integrationHealthHandler } from "../_shared/fn-integration-health.ts";

Deno.serve(integrationHealthHandler({ get: (k) => Deno.env.get(k) }));
