"use client";
import { supabase } from "@/lib/backend/client";

export interface ClearanceDecision {
 id:string; trainee_id:string; decision:"approved"|"revoked"; reason:string;
 decided_by:string; decided_at:string;
}
export interface PersonnelProposal {
 id:string; target_id:string; field:"rank"|"appointment"|"district"|"status";
 old_value:string|null; requested_value:string; reason:string;
 requested_by:string; requested_at:string; status:"pending"|"approved_for_sheet"|"rejected";
 reviewed_by:string|null; reviewed_at:string|null; review_reason:string|null;
}
function client(){const sb=supabase();if(!sb)throw new Error("Secure Headquarters database unavailable");return sb;}
export async function myPatrolClearance():Promise<boolean>{
 const {data,error}=await client().rpc("my_independent_clearance");
 if(error)throw new Error(error.message);
 return data===true;
}
export async function listClearanceDecisions():Promise<ClearanceDecision[]>{
 const {data,error}=await client().from("independent_patrol_decisions")
 .select("id,trainee_id,decision,reason,decided_by,decided_at")
 .order("decided_at",{ascending:false}).limit(300);
 if(error)throw new Error(error.message);
 return (data??[]) as ClearanceDecision[];
}
export async function recordClearance(traineeId:string,approve:boolean,reason:string):Promise<void>{
 const {data,error}=await client().rpc("record_independent_clearance",{
  p_trainee_id:traineeId,p_approve:approve,p_reason:reason
 });
 if(error)throw new Error(error.message);
 if(typeof data!=="string")throw new Error("Clearance decision was not confirmed");
}
export async function listPersonnelProposals():Promise<PersonnelProposal[]>{
 const {data,error}=await client().from("personnel_change_proposals")
 .select("id,target_id,field,old_value,requested_value,reason,requested_by,requested_at,status,reviewed_by,reviewed_at,review_reason")
 .order("requested_at",{ascending:false}).limit(200);
 if(error)throw new Error(error.message);
 return (data??[]) as PersonnelProposal[];
}
export async function proposePersonnelChange(targetId:string,field:PersonnelProposal["field"],value:string,reason:string):Promise<void>{
 const {data,error}=await client().rpc("propose_personnel_change",{
  p_target_id:targetId,p_field:field,p_new_value:value,p_reason:reason
 });
 if(error)throw new Error(error.message);
 if(typeof data!=="string")throw new Error("Proposal was not confirmed");
}
export async function reviewPersonnelChange(id:string,approve:boolean,reason:string):Promise<void>{
 const {data,error}=await client().rpc("review_personnel_change",{
  p_proposal_id:id,p_approve:approve,p_reason:reason
 });
 if(error)throw new Error(error.message);
 if(data!==(approve?"approved_for_sheet":"rejected"))throw new Error("Review was not confirmed");
}
