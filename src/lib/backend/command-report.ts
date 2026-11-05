"use client";
import { supabase } from "@/lib/backend/client";

export interface CommandOperationalReport {
 generated_at:string;
 window:{type:"rolling_7_days";timezone:string;description:string};
 staffing:{authorized:number;filled:number;vacant:number};
 personnel:{total:number;north:number;south:number;other:number;probationary:number};
 on_duty:{active_sessions:number;over_12h:number;north:number;south:number};
 duty_members:Array<{id:string;member_id:string;name:string;callsign:string|null;district:"North"|"South";started_at:string;needs_attention:boolean}>;
 patrol_7d:{completed_sessions:number;flagged_sessions:number;unflagged_minutes:number};
 pending_requests:{total:number;leave:number;transfer:number;division:number;training:number};
 pending_corrections:number;
 pending_personnel_proposals:number;
 trainees:Array<{member_id:string;name:string;callsign:string|null;signed_modules:number;required_modules:number;independent_clearance:boolean}>;
}
export async function loadCommandOperationalReport():Promise<CommandOperationalReport>{
 const sb=supabase();if(!sb)throw new Error("Secure command backend is unavailable.");
 const {data,error}=await sb.rpc("command_operational_report");
 if(error)throw new Error(error.message);
 if(!data||typeof data!=="object"||!data.generated_at||!data.staffing||!data.personnel||!data.on_duty||!data.pending_requests||!Array.isArray(data.duty_members)||!Array.isArray(data.trainees)){
  throw new Error("Command report returned an incomplete response.");
 }
 return data as CommandOperationalReport;
}
