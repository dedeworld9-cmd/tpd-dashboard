"use client";

import { useCallback, useEffect, useState } from "react";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { atLeast } from "@/lib/authz";
import { listCorrections, reviewCorrection, type Correction } from "@/lib/backend/patrol-corrections";

export function LiveSupervisor() {
 const me = useVerifiedMember();
 const [items,setItems]=useState<Correction[]>([]);
 const [busy,setBusy]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notes,setNotes]=useState<Record<string,string>>({});
 const allowed=!!me && atLeast(me.rank,"Sergeant");

 const load=useCallback(async()=>{
  if(!allowed)return;
  setLoading(true);setError("");
  try{setItems(await listCorrections());}
  catch(e){setError(e instanceof Error?e.message:"Unable to load reviews");}
  finally{setLoading(false);}
 },[allowed]);

 useEffect(()=>{void load();},[load]);

 async function decide(id:string,approve:boolean){
  if(busy)return;
  const reason=(notes[id]??"").trim();
  if(reason.length<10){setError("Enter a review justification of at least 10 characters.");return;}
  if(!window.confirm(approve?"Approve this correction? Original timestamps will remain unchanged.":"Deny this correction?"))return;
  setBusy(id);setError("");
  try{await reviewCorrection(id,approve,reason);await load();}
  catch(e){setError(e instanceof Error?e.message:"Decision failed");}
  finally{setBusy(null);}
 }
 if(!me)return null;
 if(!allowed) return <Page><PageHeader eyebrow="Operations" title="Supervisor reviews" description="Supervisor rank required."/><Callout tone="warn" title="Access restricted">This workspace requires Sergeant or above and server-side authorization.</Callout></Page>;
 return <Page wide>
  <PageHeader eyebrow="Operations" title="Patrol corrections" description="Review requested timestamp corrections. All decisions are audited, and original patrol sessions remain unchanged." />
  <div className="space-y-4">
  {error&&<Callout tone="error" title="Review error">{error}</Callout>}
  <Button variant="secondary" onClick={()=>void load()} disabled={loading||!!busy}>Refresh queue</Button>
  {loading?<p role="status" className="text-xs text-muted">Loading correction requests…</p>:
   <Card>
    <CardHeader title="Correction review queue" description="Requests are shown newest first. You cannot review your own request."/>
    {items.length===0?<EmptyState title="No correction requests" body="Officer correction requests will appear here."/>:
     <ul className="divide-y divide-line border-t border-line">
     {items.map(c=><li key={c.id} className="space-y-3 px-4 py-4 text-xs">
      <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">Session {c.session_id.slice(0,8)} · {c.status}</p><span className="text-muted">{new Date(c.created_at).toLocaleString()}</span></div>
      <p><strong>Proposed start:</strong> {new Date(c.proposed_started_at).toLocaleString()}</p>
      <p><strong>Proposed end:</strong> {new Date(c.proposed_ended_at).toLocaleString()}</p>
      <p><strong>Officer reason:</strong> {c.reason}</p>
      {c.status==="pending" ? <>
       <label className="block font-semibold" htmlFor={`review-${c.id}`}>Review justification</label>
       <textarea id={`review-${c.id}`} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-ink" rows={2} maxLength={2000} value={notes[c.id]??""} onChange={e=>setNotes(n=>({...n,[c.id]:e.target.value}))} placeholder="Explain your decision (10 characters minimum)" />
       <div className="flex gap-2"><Button variant="gold" size="sm" disabled={!!busy} onClick={()=>void decide(c.id,true)}>Approve</Button><Button variant="secondary" size="sm" disabled={!!busy} onClick={()=>void decide(c.id,false)}>Deny</Button></div>
      </>: <p className="text-muted">Decision reason: {c.reviewer_reason??"—"}</p>}
     </li>)}
     </ul>
    }
   </Card>}
  </div>
 </Page>;
}
