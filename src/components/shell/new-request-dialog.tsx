"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/feedback";
import { reviewRequirement, type RequestType } from "@/lib/authz";
import { OperationError, requests } from "@/lib/preview/store";

export type NewRequestType = Exclude<RequestType, "Activity correction">;

export const NEW_REQUEST_TYPES: NewRequestType[] = ["Leave of absence", "LOA extension", "Transfer", "Division application", "Ride-along", "Training enrollment"];

/**
 * Generic member request. Activity corrections are created from the patrol
 * history instead, because they must reference a specific session.
 */
export function NewRequestDialog({ open, initialType, onClose }: { open: boolean; initialType?: NewRequestType; onClose: () => void }) {
  const router = useRouter();
  const id = useId();
  const [type, setType] = useState<NewRequestType>(initialType ?? "Leave of absence");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setType(initialType ?? "Leave of absence");
      setSummary("");
      setDetail("");
      setError(null);
    }
  }, [open, initialType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await requests.create(type, summary, detail);
      onClose();
      toast("success", `${r.id} submitted`, `${r.type} is waiting for review.`);
      router.push(`/hq/requests?id=${r.id}`);
    } catch (err) {
      if (!(err instanceof OperationError && err.message === "Already in progress")) setError(err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      title="New request"
      description="Goes to the reviewer your request type requires. You can follow it under Requests."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} loading={busy}>
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Type" htmlFor={`${id}-type`} hint={`Reviewed by ${reviewRequirement(type)}.`}>
          <Select id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as NewRequestType)} className="w-full">
            {NEW_REQUEST_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Summary" htmlFor={`${id}-summary`}>
          <Input id={`${id}-summary`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. 10 days · exams" maxLength={80} />
        </Field>
        <Field label="Details for the reviewer" htmlFor={`${id}-detail`} error={error}>
          <Textarea id={`${id}-detail`} value={detail} onChange={(e) => setDetail(e.target.value)} aria-invalid={!!error || undefined} rows={4} />
        </Field>
      </form>
    </Dialog>
  );
}
