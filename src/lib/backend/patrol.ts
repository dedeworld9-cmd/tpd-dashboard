"use client";

import { supabase } from "@/lib/backend/client";

export interface RecordedPatrol {
  id: string;
  district: "North" | "South";
  started_at: string;
  ended_at: string | null;
  review_required: boolean;
  reused?: boolean;
}

/** Server is authoritative: no client-provided personnel ID or timestamps. */
export async function patrolStart(district: "North" | "South"): Promise<RecordedPatrol> {
  const sb = supabase();
  if (!sb) throw new Error("Secure patrol backend is unavailable.");
  const { data, error } = await sb.rpc("start_patrol", { p_district: district });
  if (error) throw new Error(error.message);
  if (!data?.id || !data?.started_at) throw new Error("Patrol service returned an invalid session.");
  return data as RecordedPatrol;
}

export async function patrolEnd(id: string): Promise<RecordedPatrol> {
  const sb = supabase();
  if (!sb) throw new Error("Secure patrol backend is unavailable.");
  const { data, error } = await sb.rpc("end_patrol", { p_session_id: id });
  if (error) throw new Error(error.message);
  if (!data?.id || !data?.ended_at) throw new Error("Patrol end was not confirmed by the server.");
  return data as RecordedPatrol;
}

export async function patrolHistory(): Promise<RecordedPatrol[]> {
  const sb = supabase();
  if (!sb) throw new Error("Secure patrol backend is unavailable.");
  const { data, error } = await sb.from("patrol_sessions")
    .select("id,district,started_at,ended_at,review_required")
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as RecordedPatrol[];
}
