"use client";
import { supabase } from "@/lib/backend/client";

export type Correction = {
 id: string;
 session_id: string;
 requester_id: string;
 proposed_started_at: string;
 proposed_ended_at: string;
 reason: string;
 status: "pending" | "approved" | "denied";
 reviewer_reason: string | null;
 created_at: string;
 reviewed_at: string | null;
};

function api() {
 const sb = supabase();
 if (!sb) throw new Error("Secure backend unavailable");
 return sb;
}
export async function requestCorrection(sessionId:string, startedAt:string, endedAt:string, reason:string) {
 const {data,error}=await api().rpc("request_patrol_correction",{
   p_session_id:sessionId,p_started_at:new Date(startedAt).toISOString(),
   p_ended_at:new Date(endedAt).toISOString(),p_reason:reason
 });
 if(error) throw new Error(error.message);
 return data as string;
}
export async function reviewCorrection(id:string,approve:boolean,reason:string) {
 const {data,error}=await api().rpc("review_patrol_correction",{
   p_correction_id:id,p_approve:approve,p_reason:reason
 });
 if(error) throw new Error(error.message);
 return data as string;
}
export async function listCorrections():Promise<Correction[]> {
 const {data,error}=await api().from("patrol_corrections")
 .select("id,session_id,requester_id,proposed_started_at,proposed_ended_at,reason,status,reviewer_reason,created_at,reviewed_at")
 .order("created_at",{ascending:false}).limit(100);
 if(error) throw new Error(error.message);
 return (data??[]) as Correction[];
}
