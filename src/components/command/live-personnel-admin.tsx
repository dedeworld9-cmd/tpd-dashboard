"use client";
import { useCallback, useEffect, useState } from "react";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { allMembers } from "@/lib/preview/store";
import { RANKS, atLeast } from "@/lib/authz";
import { listPersonnelProposals, proposePersonnelChange, reviewPersonnelChange,
 type PersonnelProposal } from "@/lib/backend/phase6";

type Field=PersonnelProposal["field"];
const fields:Field[]=["rank","appointment","district","status"];
const ootcRanks=["Chief of Police","Deputy Chief","Assistant Chief"];
export function LivePersonnelAdministration(){
 const me=useVerifiedMember();
 const [items,setItems]=useState<PersonnelProposal[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [personnelId,setPersonnelId]=useState("");
 const [field,setField]=useState<Field>("rank");
 const [proposed,setProposed]=useState("");
 const [reason,setReason]=useState("");
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 const canPropose=!!me&&atLeast(me.rank,"Captain");
 const canReview=!!me&&ootcRanks.includes(me.rank);
 const members=allMembers();
 const load=useCallback(async()=>{
  if(!canPropose)return;
  setLoading(true);setError("");
  try{setItems(await listPersonnelProposals());}
  catch(e){setError(e instanceof Error?e.message:"Unable to read personnel proposals.");}
  finally{setLoading(false);}
 },[canPropose]);
 useEffect(()=>{void load();},[load]);
 async function submit(){
  if(busy||!personnelId||proposed.trim().length===0||reason.trim().length<15)return;
  if(!window.confirm("Submit this proposal? It will not update the official Google Sheets roster."))return;
  setBusy(true);setError("");setNotice("");
  try{await proposePersonnelChange(personnelId,field,proposed.trim(),reason.trim());setReason("");setProposed("");await load();setNotice("Proposal recorded for review. Official roster unchanged.");}
  catch(e){setError(e instanceof Error?e.message:"Proposal rejected.");}
  finally{setBusy(false);}
 }
 async function review(item:PersonnelProposal,approve:boolean){
  if(busy||!canReview)return;
  const note=(reviewNotes[item.id]??"").trim();
  if(note.length<10){setError("Decision reason must contain at least 10 characters.");return;}
  if(!window.confirm(approve?"Approve for manual Google Sheets reconciliation? No roster data will change automatically.":"Reject this personnel proposal?"))return;
  setBusy(true);setError("");setNotice("");
  try{await reviewPersonnelChange(item.id,approve,note);await load();setNotice("Decision recorded. No automatic roster mutation.");}
  catch(e){setError(e instanceof Error?e.message:"Review failed.");}
  finally{setBusy(false);}
 }
 if(!me)return null;
 if(!canPropose)return <Page><PageHeader eyebrow="Command" title="Personnel administration" description="Restricted to Captain and above."/><Callout tone="warn" title="Access restricted">The database independently enforces command authorization.</Callout></Page>;
 return <Page wide>
  <PageHeader eyebrow="Command" title="Personnel administration" description="Audited personnel-change proposals and Office of the Chiefs review."/>
  <div className="space-y-5">
   <Callout tone="info" title="Google Sheets remains the roster authority">
    Approved changes are recommendations for authorized staff to enter in the official Google Sheet. This screen does not directly edit ranks, callsigns, membership, Discord roles or Google Sheets. Roster changes appear only after a separate verified sync.
   </Callout>
   {error&&<Callout tone="error" title="Personnel administration error">{error}</Callout>}
   {notice&&<p role="status" className="text-xs font-semibold text-green">{notice}</p>}
   <Card>
    <CardHeader title="Propose personnel change" description="Captain+ may submit proposals; only the Office of the Chiefs may review them."/>
    <div className="grid gap-3 border-t border-line p-4 text-xs">
     <label className="font-semibold">Personnel record
      <select value={personnelId} onChange={e=>setPersonnelId(e.target.value)}
       className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink">
       <option value="">Select member</option>
       {members.filter(m=>m.id!==me.id).map(m=><option key={m.id} value={m.id}>{m.name} · {m.callsign} · {m.rank}</option>)}
      </select>
     </label>
     <label className="font-semibold">Field
      <select value={field} onChange={e=>{setField(e.target.value as Field);setProposed("");}}
       className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink">
       {fields.map(f=><option key={f} value={f}>{f}</option>)}
      </select>
     </label>
     <label className="font-semibold">Proposed value
      {field==="rank"?
       <select value={proposed} onChange={e=>setProposed(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink">
        <option value="">Select rank</option>{RANKS.map(r=><option key={r} value={r}>{r}</option>)}
       </select>:field==="district"||field==="status"?
       <select value={proposed} onChange={e=>setProposed(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink">
        <option value="">Select value</option>
        {(field==="district"?["North","South","Department"]:["active","inactive","former"]).map(v=><option key={v}>{v}</option>)}
       </select>:
       <input maxLength={140} value={proposed} onChange={e=>setProposed(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink"/>}
     </label>
     <label className="font-semibold">Reason (at least 15 characters)
      <textarea rows={3} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}
       className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink"/>
     </label>
     <div><Button variant="gold" size="sm" loading={busy} disabled={busy||!personnelId||!proposed||reason.trim().length<15} onClick={()=>void submit()}>Submit proposal</Button></div>
    </div>
   </Card>
   <Card>
    <CardHeader title="Personnel change review" description="Decisions are permanently audited. Manual sheet reconciliation is still required."/>
    <div className="border-t border-line p-4"><Button size="sm" variant="secondary" disabled={busy||loading} onClick={()=>void load()}>Refresh proposals</Button></div>
    {loading?<p role="status" className="p-4 text-xs text-muted">Loading proposals…</p>:
     items.length===0?<EmptyState title="No personnel change proposals" body="Proposals and review decisions will appear here."/>:
     <ul className="divide-y divide-line border-t border-line">
      {items.map(item=><li key={item.id} className="space-y-2 p-4 text-xs">
       <p className="font-semibold">{members.find(m=>m.id===item.target_id)?.name??"Personnel member"} · {item.field} · {item.status.replaceAll("_"," ")}</p>
       <p>From <strong>{item.old_value??"—"}</strong> to <strong>{item.requested_value}</strong></p>
       <p className="whitespace-pre-wrap text-muted">{item.reason}</p>
       <p className="text-muted">Submitted {new Date(item.requested_at).toLocaleString()}</p>
       {item.review_reason&&<p>Review: {item.review_reason}</p>}
       {canReview&&item.status==="pending"&&item.requested_by!==me.id&&item.target_id!==me.id&&<>
        <label className="block font-semibold">Decision explanation
         <textarea rows={2} maxLength={2000} value={reviewNotes[item.id]??""}
          onChange={e=>setReviewNotes(x=>({...x,[item.id]:e.target.value}))}
          className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink"/>
        </label>
        <div className="flex gap-2">
         <Button size="sm" variant="gold" disabled={busy||(reviewNotes[item.id]??"").trim().length<10} onClick={()=>void review(item,true)}>Approve for sheet</Button>
         <Button size="sm" variant="secondary" disabled={busy||(reviewNotes[item.id]??"").trim().length<10} onClick={()=>void review(item,false)}>Reject</Button>
        </div>
       </>}
      </li>)}
     </ul>}
   </Card>
  </div>
 </Page>;
}
