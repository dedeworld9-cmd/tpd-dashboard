"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock3, Shield, Users, UserRoundCheck } from "lucide-react";
import { Page, PageHeader } from "@/components/shell/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { Card, CardHeader } from "@/components/ui/surface";
import { useVerifiedMember } from "@/lib/backend/auth";
import { can } from "@/lib/authz";
import { actorFor } from "@/lib/backend/membership";
import { loadCommandOperationalReport, type CommandOperationalReport } from "@/lib/backend/command-report";

const num=(n:number|undefined)=>Number.isFinite(n)?String(n):"—";
function PillMetric({label,value,sub}:{label:string;value:number;sub:string}){
 return <Card className="p-4"><p className="text-xs font-semibold text-muted">{label}</p>
  <p className="mt-2 text-3xl font-semibold tabular">{num(value)}</p><p className="mt-1 text-2xs text-muted">{sub}</p>
 </Card>;
}
export function LiveCommandReport(){
 const me=useVerifiedMember();
 const [report,setReport]=useState<CommandOperationalReport|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const allowed=!!me&&can(actorFor(me),"command.view");
 const load=useCallback(async()=>{
  if(!allowed)return;
  setLoading(true);setError("");
  try{setReport(await loadCommandOperationalReport());}
  catch(e){setReport(null);setError(e instanceof Error?e.message:"Could not load report.");}
  finally{setLoading(false);}
 },[allowed]);
 useEffect(()=>{void load();},[load]);
 if(!me)return null;
 if(!allowed)return <Page><PageHeader eyebrow="Command" title="Command Center" description="Captain+ authorization required."/>
  <Callout tone="warn" title="Access restricted">Command reporting is enforced by the database and is not accessible to this rank.</Callout>
 </Page>;
 const pending=(report?.pending_requests.total??0)+(report?.pending_corrections??0)+(report?.pending_personnel_proposals??0);
 const minutes=report?.patrol_7d.unflagged_minutes??0;
 return <Page wide>
  <PageHeader eyebrow="TPD Headquarters" title="Command Center"
   description="Live staffing, patrol operations, review workload, and training progress from TPD's official Supabase records."
   actions={<div className="flex flex-wrap gap-2">
    <Button size="sm" variant="secondary" disabled={loading} onClick={()=>void load()}>Refresh report</Button>
    <ButtonLink href="/hq/command/personnel" size="sm" variant="secondary">Personnel administration</ButtonLink>
   </div>}/>
  <div className="space-y-5">
   <Callout tone="info" title="Operational reporting — not a compliance verdict">
    All figures are read-only and sourced from real TPD records. The patrol window is a rolling seven days; unflagged completed minutes exclude unresolved long shifts but are not an approved quota total. Activity corrections and exemptions are not silently converted into compliance decisions.
   </Callout>
   {error&&<Callout tone="error" title="Command report unavailable">{error} No cached or sample figures will be displayed.</Callout>}
   {loading&&<p role="status" className="text-sm text-muted">Loading verified TPD operational report…</p>}
   {!loading&&report&&<>
    <p className="text-2xs text-muted">Report generated {new Date(report.generated_at).toLocaleString()} · Refresh to fetch current records</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
     <PillMetric label="Active personnel" value={report.personnel.total} sub="verified TPD roster"/>
     <PillMetric label="On duty now" value={report.on_duty.active_sessions} sub="open server-recorded patrols"/>
     <PillMetric label="Pending actions" value={pending} sub="requests, corrections and proposals"/>
     <PillMetric label="Unfilled positions" value={report.staffing.vacant} sub={`${num(report.staffing.filled)} / ${num(report.staffing.authorized)} authorized slots filled`}/>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
     <Card>
      <CardHeader title="District staffing" description="Live roster members and active patrol sessions; department-level staff counted separately."/>
      <div className="space-y-3 border-t border-line p-4 text-xs">
       {([{name:"North",members:report.personnel.north,onDuty:report.on_duty.north},
          {name:"South",members:report.personnel.south,onDuty:report.on_duty.south}] as const).map(d=>
        <div key={d.name} className="flex items-center justify-between gap-3 border-b border-line pb-3">
         <span className="font-semibold">{d.name} District</span>
         <span className="text-right tabular">{num(d.members)} members · {num(d.onDuty)} on duty</span>
        </div>)}
       <p className="text-muted">Department / other: {num(report.personnel.other)} members · Probationary: {num(report.personnel.probationary)}</p>
      </div>
     </Card>
     <Card>
      <CardHeader title="Patrol activity · last 7 days" description="Completed sessions only; rolling 7-day interval, not calendar-week compliance."/>
      <div className="grid grid-cols-2 gap-3 border-t border-line p-4">
       <div><Clock3 className="size-4 text-gold-ink"/><p className="mt-2 text-2xl font-semibold tabular">{Math.floor(minutes/60)}h {Math.round(minutes%60)}m</p><p className="mt-1 text-2xs text-muted">Provisional unflagged time</p></div>
       <div><UserRoundCheck className="size-4 text-gold-ink"/><p className="mt-2 text-2xl font-semibold tabular">{num(report.patrol_7d.completed_sessions)}</p><p className="mt-1 text-2xs text-muted">Completed patrol sessions</p></div>
       {report.patrol_7d.flagged_sessions>0&&<p className="col-span-2 text-xs text-amber">{report.patrol_7d.flagged_sessions} completed session(s) flagged for review and excluded from time.</p>}
      </div>
     </Card>
    </div>
    <Card>
     <CardHeader title="Currently on duty" description="Officer identities are visible only to authorized command personnel."/>
     {report.duty_members.length===0?<EmptyState title="No active patrol sessions" body="No official patrol timers are currently running." icon={<Shield/>}/>:
      <ul className="divide-y divide-line border-t border-line">
       {report.duty_members.map(p=><li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs">
        <div><p className="font-semibold">{p.name} · {p.callsign??"No callsign"}</p><p className="text-muted">{p.district} District · Started {new Date(p.started_at).toLocaleString()}</p></div>
        {p.needs_attention?<span className="inline-flex items-center gap-1 text-amber"><AlertTriangle className="size-4"/> Over 12 hours</span>:<span className="text-green">On duty</span>}
       </li>)}
      </ul>}
    </Card>
    <div className="grid gap-4 lg:grid-cols-2">
     <Card>
      <CardHeader title="Pending review workload" description="Live counts only; no guessed queues or automatic approvals."/>
      <div className="grid grid-cols-2 gap-3 border-t border-line p-4">
       <PillMetric label="Member requests" value={report.pending_requests.total} sub={`LOA ${report.pending_requests.leave}, transfers ${report.pending_requests.transfer}`}/>
       <PillMetric label="Patrol corrections" value={report.pending_corrections} sub="awaiting supervisor review"/>
       <PillMetric label="Personnel proposals" value={report.pending_personnel_proposals} sub="awaiting OOTC decision"/>
       <PillMetric label="Other requests" value={report.pending_requests.division+report.pending_requests.training} sub="division and training"/>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line p-4">
       <ButtonLink href="/hq/requests" variant="secondary" size="sm">Review requests</ButtonLink>
       <ButtonLink href="/hq/supervisor" variant="secondary" size="sm">Patrol corrections</ButtonLink>
       <ButtonLink href="/hq/command/personnel" variant="secondary" size="sm">Personnel proposals</ButtonLink>
      </div>
     </Card>
     <Card>
      <CardHeader title="Probationary training" description="Six signed modules and separate OOTC clearance are tracked independently."/>
      {report.trainees.length===0?<EmptyState icon={<Users/>} title="No probationary personnel" body="The synced active roster currently has no probationary officers."/>:
       <ul className="divide-y divide-line border-t border-line">
        {report.trainees.map(t=><li key={t.member_id} className="flex items-center justify-between gap-3 p-4 text-xs">
         <div><p className="font-semibold">{t.name} · {t.callsign??"No callsign"}</p><p className="text-muted">{num(t.signed_modules)} of {num(t.required_modules)} modules signed</p></div>
         <span className={t.independent_clearance?"text-green":"text-amber"}>{t.independent_clearance?"Approved":"Not cleared"}</span>
        </li>)}
       </ul>}
      <div className="border-t border-line p-4"><ButtonLink href="/hq/training" size="sm" variant="secondary">Open Training</ButtonLink></div>
     </Card>
    </div>
   </>}
  </div>
 </Page>;
}
