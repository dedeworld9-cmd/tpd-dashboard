"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { actorFor } from "@/lib/backend/membership";
import { canDecide } from "@/lib/authz";
import { memberById } from "@/lib/preview/store";
import {
 REQUEST_KINDS, fetchMemberRequests, submitMemberRequest, reviewMemberRequest,
 withdrawMemberRequest, type MemberRequestKind, type MemberRequestRecord,
} from "@/lib/backend/member-requests";

const openStatus = (s: string) => s === "submitted" || s === "under_review";
const label = (s: string) => s.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

export function LiveRequests() {
 const me = useVerifiedMember();
 const [items,setItems] = useState<MemberRequestRecord[]>([]);
 const [loading,setLoading] = useState(true);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [notice,setNotice] = useState("");
 const [tab,setTab] = useState<"mine"|"review">("mine");
 const [formOpen,setFormOpen] = useState(false);
 const [kind,setKind] = useState<MemberRequestKind>("Leave of absence");
 const [summary,setSummary] = useState("");
 const [detail,setDetail] = useState("");
 const [leaveStart,setLeaveStart] = useState("");
 const [leaveEnd,setLeaveEnd] = useState("");
 const [reasons,setReasons] = useState<Record<string,string>>({});

 const load = useCallback(async () => {
  setLoading(true);setError("");
  try { setItems(await fetchMemberRequests()); }
  catch (e) { setError(e instanceof Error?e.message:"Could not load requests."); }
  finally { setLoading(false); }
 },[]);
 useEffect(()=>{void load();},[load]);

 async function submit(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();
  if (busy || !me) return;
  setBusy(true);setError("");setNotice("");
  try {
   await submitMemberRequest({
    kind, summary:summary.trim(), detail:detail.trim(),
    leaveStart:kind==="Leave of absence"?leaveStart:null,
    leaveEnd:kind==="Leave of absence"?leaveEnd:null,
   });
   setSummary("");setDetail("");setLeaveStart("");setLeaveEnd("");setFormOpen(false);
   setTab("mine");setNotice("Your request was submitted and recorded for review.");
   await load();
  } catch(e) {setError(e instanceof Error?e.message:"Submission failed.");}
  finally {setBusy(false);}
 }

 async function withdraw(id:string) {
  if (busy || !window.confirm("Withdraw this request? This action will be recorded."))return;
  setBusy(true);setError("");setNotice("");
  try { await withdrawMemberRequest(id);await load();setNotice("Request withdrawn."); }
  catch(e){setError(e instanceof Error?e.message:"Withdrawal failed.");}
  finally{setBusy(false);}
 }

 async function decide(r:MemberRequestRecord,approve:boolean) {
  if (busy || !me || !canDecide(actorFor(me),r.kind,false))return;
  const reason=(reasons[r.id]??"").trim();
  if(reason.length<10){setError("A review decision requires at least 10 characters of explanation.");return;}
  if(!window.confirm(approve?"Approve this request? The action will be audited.":"Deny this request? The action will be audited."))return;
  setBusy(true);setError("");setNotice("");
  try{await reviewMemberRequest(r.id,approve,reason);await load();setNotice("Decision recorded.");}
  catch(e){setError(e instanceof Error?e.message:"Review failed.");}
  finally{setBusy(false);}
 }

 if(!me)return null;
 const mine=items.filter(r=>r.requester_id===me.id);
 const review=items.filter(r=>r.requester_id!==me.id && openStatus(r.status) && canDecide(actorFor(me),r.kind,false));
 const rows=tab==="mine"?mine:review;
 const mayReview=review.length>0 || items.some(r=>r.requester_id!==me.id && canDecide(actorFor(me),r.kind,false));

 return <Page wide>
  <PageHeader eyebrow="Headquarters" title="Requests"
    description="Submit and track official department requests. Every decision requires a human reviewer and a recorded reason."
    actions={<Button variant="gold" onClick={()=>setFormOpen(x=>!x)} disabled={busy} icon={<Plus className="size-4" />}>{formOpen?"Close form":"New request"}</Button>} />
  <div className="space-y-5">
   <Callout tone="info" title="Human review, no automatic personnel changes">
    Approval records a decision. It does not automatically change roster assignments, waive activity requirements or grant training qualifications. LOA extension and ride-along routing remain unavailable until their approval rules are confirmed.
   </Callout>
   {error&&<Callout tone="error" title="Requests error">{error}</Callout>}
   {notice&&<p role="status" className="text-xs font-semibold text-green">{notice}</p>}
   {formOpen&&<Card>
    <CardHeader title="Submit request" description="Details are visible only to you and authorized reviewers."/>
    <form onSubmit={e=>void submit(e)} className="grid gap-4 border-t border-line p-4 text-xs">
     <label className="font-semibold">Request type
      <select value={kind} onChange={e=>setKind(e.target.value as MemberRequestKind)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink">
       {REQUEST_KINDS.map(k=><option key={k} value={k}>{k}</option>)}
      </select>
     </label>
     <label className="font-semibold">Summary (8–100 characters)
      <input required minLength={8} maxLength={100} value={summary} onChange={e=>setSummary(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink" placeholder="Briefly describe your request"/>
     </label>
     <label className="font-semibold">Details (20–4,000 characters)
      <textarea required minLength={20} maxLength={4000} rows={4} value={detail} onChange={e=>setDetail(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink" placeholder="Explain your request and any relevant context"/>
     </label>
     {kind==="Leave of absence"&&<div className="grid gap-3 sm:grid-cols-2">
      <label className="font-semibold">Leave start date
       <input type="date" required value={leaveStart} onChange={e=>setLeaveStart(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink" />
      </label>
      <label className="font-semibold">Leave end date
       <input type="date" required value={leaveEnd} onChange={e=>setLeaveEnd(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink" />
      </label>
      <p className="text-muted sm:col-span-2">Ordinary leave may last up to 14 consecutive calendar days. An extension requires separate authorization.</p>
     </div>}
     <div><Button type="submit" variant="gold" loading={busy} disabled={busy}>Submit for review</Button></div>
    </form>
   </Card>}
   <div className="flex flex-wrap gap-2" role="group" aria-label="Request view">
    <Button size="sm" variant={tab==="mine"?"primary":"secondary"} onClick={()=>setTab("mine")}>My requests ({mine.length})</Button>
    {mayReview&&<Button size="sm" variant={tab==="review"?"primary":"secondary"} onClick={()=>setTab("review")}>Review queue ({review.length})</Button>}
    <Button size="sm" variant="secondary" disabled={loading||busy} onClick={()=>void load()}>Refresh</Button>
   </div>
   <Card>
    <CardHeader title={tab==="mine"?"My requests":"Requests awaiting my review"} description="Most recent first. Access is enforced by Supabase." />
    {loading?<p role="status" className="p-4 text-sm text-muted">Loading requests…</p>:
     rows.length===0?<EmptyState icon={<ClipboardList/>} title="No requests here" body={tab==="mine"?"Submitted requests will appear here.":"Nothing currently requires your review."}/>:
     <ul className="divide-y divide-line border-t border-line">
      {rows.map(r=><li key={r.id} className="space-y-3 px-4 py-4 text-xs">
       <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">{r.kind} · {r.summary}</p>
         <p className="mt-1 text-muted">{tab==="review"?(memberById(r.requester_id)?.name??"Roster member"):"My request"} · {new Date(r.created_at).toLocaleString()}</p></div>
        <span className="rounded-md border border-line px-2 py-1 font-semibold">{label(r.status)}</span>
       </div>
       <p className="whitespace-pre-wrap text-ink-2">{r.detail}</p>
       {r.leave_start&&<p>Leave dates: {r.leave_start} through {r.leave_end}</p>}
       {r.decision_reason&&<p className="text-muted">Reviewer explanation: {r.decision_reason}</p>}
       {tab==="mine"&&openStatus(r.status)&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>void withdraw(r.id)}>Withdraw request</Button>}
       {tab==="review"&&openStatus(r.status)&&<>
        <label className="block font-semibold">Decision explanation (at least 10 characters)
         <textarea value={reasons[r.id]??""} onChange={e=>setReasons(x=>({...x,[r.id]:e.target.value}))} rows={2} maxLength={2000} className="mt-1 block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink" />
        </label>
        <div className="flex gap-2">
         <Button size="sm" variant="gold" disabled={busy||(reasons[r.id]??"").trim().length<10} onClick={()=>void decide(r,true)}>Approve</Button>
         <Button size="sm" variant="secondary" disabled={busy||(reasons[r.id]??"").trim().length<10} onClick={()=>void decide(r,false)}>Deny</Button>
        </div>
       </>}
      </li>)}
     </ul>}
   </Card>
  </div>
 </Page>;
}
