"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { allMembers } from "@/lib/preview/store";
import { listClearanceDecisions, recordClearance, type ClearanceDecision } from "@/lib/backend/phase6";
import type { TrainingSignoff } from "@/lib/backend/training";

export function LiveClearancePanel({signoffs}:{signoffs:TrainingSignoff[]}){
 const me=useVerifiedMember();
 const [decisions,setDecisions]=useState<ClearanceDecision[]>([]);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [traineeId,setTraineeId]=useState("");
 const [reason,setReason]=useState("");
 const allowed=!!me&&["Chief of Police","Deputy Chief","Assistant Chief"].includes(me.rank);
 const trainees=allMembers().filter(m=>m.rank==="Probationary Officer");
 const latest=(id:string)=>decisions.find(d=>d.trainee_id===id);
 const load=useCallback(async()=>{
  setLoading(true);
  try{setDecisions(await listClearanceDecisions());}
  catch(e){setError(e instanceof Error?e.message:"Could not load clearance decisions.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function decide(approve:boolean){
  if(busy||!allowed||!traineeId||reason.trim().length<15)return;
  const message=approve?"Approve independent patrol? This authorizes patrol but does not change the Google Sheets roster or rank.":"Revoke independent patrol authorization immediately?";
  if(!window.confirm(message))return;
  setBusy(true);setError("");setNotice("");
  try{
   await recordClearance(traineeId,approve,reason.trim());
   setReason("");
   await load();
   setNotice(approve?"Independent patrol clearance recorded. Update the official roster separately when appropriate.":"Independent patrol clearance revoked and audited.");
  }catch(e){setError(e instanceof Error?e.message:"Clearance decision failed.");}
  finally{setBusy(false);}
 }
 if(!me)return null;
 const own=latest(me.id);
 const selected=latest(traineeId);
 const completed=new Set(signoffs.filter(x=>x.trainee_id===traineeId).map(x=>x.module_key)).size;
 if(!allowed && me.rank!=="Probationary Officer")return null;
 return <Card>
  <CardHeader title="Independent patrol authorization" description="Only the Office of the Chiefs may grant or revoke independent patrol after all six module sign-offs."/>
  <div className="space-y-3 border-t border-line p-4 text-xs">
   {error&&<Callout tone="error" title="Clearance error">{error}</Callout>}
   {notice&&<p role="status" className="font-semibold text-green">{notice}</p>}
   {loading?<p role="status" className="text-muted">Checking official clearance decisions…</p>:<>
    {me.rank==="Probationary Officer"&&<p><strong>Your clearance:</strong> {own?.decision==="approved"?"Approved":own?.decision==="revoked"?"Revoked":"Not approved"}</p>}
    {allowed&&<>
     <label className="block font-semibold">Probationary officer
      <select value={traineeId} onChange={e=>{setTraineeId(e.target.value);setNotice("");}} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink">
       <option value="">Select trainee</option>
       {trainees.map(t=><option key={t.id} value={t.id}>{t.name} · {t.callsign}</option>)}
      </select>
     </label>
     {traineeId&&<>
      <p><strong>Modules:</strong> {completed} of 6 recorded. <strong>Clearance:</strong> {selected?.decision??"Not approved"}</p>
      {completed<6&&selected?.decision!=="approved"&&<p className="text-amber">Approval is locked until all six training modules are signed off.</p>}
      <label className="block font-semibold">Decision justification (15–2,000 characters)
       <textarea rows={3} value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink"/>
      </label>
      <div className="flex flex-wrap gap-2">
       {selected?.decision!=="approved"&&<Button size="sm" variant="gold" disabled={busy||completed<6||reason.trim().length<15} onClick={()=>void decide(true)}>Grant independent patrol</Button>}
       {selected?.decision==="approved"&&<Button size="sm" variant="danger" disabled={busy||reason.trim().length<15} onClick={()=>void decide(false)}>Revoke clearance</Button>}
      </div>
     </>}
    </>}
   </>}
  </div>
 </Card>;
}
