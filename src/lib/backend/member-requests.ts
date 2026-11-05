"use client";

import { supabase } from "@/lib/backend/client";

export const REQUEST_KINDS = [
  "Leave of absence", "Transfer", "Division application", "Training enrollment",
] as const;
export type MemberRequestKind = typeof REQUEST_KINDS[number];
export type MemberRequestStatus = "submitted" | "under_review" | "approved" | "denied" | "withdrawn";

export interface MemberRequestRecord {
  id: string;
  requester_id: string;
  kind: MemberRequestKind;
  summary: string;
  detail: string;
  leave_start: string | null;
  leave_end: string | null;
  status: MemberRequestStatus;
  decision_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

function client() {
  const sb = supabase();
  if (!sb) throw new Error("Secure requests backend is unavailable.");
  return sb;
}
export async function fetchMemberRequests(): Promise<MemberRequestRecord[]> {
  const { data, error } = await client().from("member_requests")
    .select("id,requester_id,kind,summary,detail,leave_start,leave_end,status,decision_reason,created_at,decided_at")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as MemberRequestRecord[];
}
export async function submitMemberRequest(input: {
  kind: MemberRequestKind; summary: string; detail: string;
  leaveStart?: string | null; leaveEnd?: string | null;
}): Promise<string> {
  const { data, error } = await client().rpc("submit_member_request", {
    p_kind: input.kind, p_summary: input.summary, p_detail: input.detail,
    p_leave_start: input.leaveStart ?? null, p_leave_end: input.leaveEnd ?? null,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error("Request submission was not confirmed.");
  return data;
}
export async function withdrawMemberRequest(id: string): Promise<void> {
  const { data, error } = await client().rpc("withdraw_member_request", { p_request_id: id });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Withdrawal was not confirmed.");
}
export async function reviewMemberRequest(id: string, approve: boolean, reason: string): Promise<void> {
  const { data, error } = await client().rpc("review_member_request", {
    p_request_id: id, p_approve: approve, p_reason: reason,
  });
  if (error) throw new Error(error.message);
  if (data !== (approve ? "approved" : "denied")) throw new Error("Review was not confirmed.");
}
