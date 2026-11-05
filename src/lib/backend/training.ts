"use client";

import { supabase } from "@/lib/backend/client";
import type { TrainingStepKey } from "@/lib/department";

export interface TrainingSignoff {
 id: string;
 trainee_id: string;
 module_key: Exclude<TrainingStepKey, "approval">;
 evidence: string;
 signed_by: string;
 signed_at: string;
}
function client() {
 const sb=supabase();
 if(!sb)throw new Error("Training service unavailable.");
 return sb;
}
export async function listTrainingSignoffs():Promise<TrainingSignoff[]> {
 const {data,error}=await client().from("training_signoffs")
  .select("id,trainee_id,module_key,evidence,signed_by,signed_at")
  .order("signed_at",{ascending:false}).limit(300);
 if(error)throw new Error(error.message);
 return (data??[]) as TrainingSignoff[];
}
export async function signOffTrainingModule(traineeId:string,key:Exclude<TrainingStepKey,"approval">,evidence:string):Promise<void>{
 const {data,error}=await client().rpc("signoff_training_module",{
  p_trainee_id:traineeId,p_module_key:key,p_evidence:evidence
 });
 if(error)throw new Error(error.message);
 if(typeof data!=="string")throw new Error("Training sign-off was not confirmed.");
}
