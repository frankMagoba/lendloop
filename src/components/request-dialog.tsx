"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { localToday } from "@/lib/format";
import { usePendingAction } from "@/lib/use-pending-action";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, inputClass } from "@/components/ui/field";

type RequestedTool = { _id: Id<"tools">; name: string; ownerName: string };

export function RequestDialog({
  tool,
  onClose,
  onSent,
}: {
  tool: RequestedTool | null;
  onClose: () => void;
  onSent: (toolName: string) => void;
}) {
  return (
    <Dialog
      open={tool !== null}
      onClose={onClose}
      title={tool ? `Borrow the ${tool.name}` : ""}
    >
      {tool && (
        <RequestForm
          tool={tool}
          onCancel={onClose}
          onSent={() => {
            onSent(tool.name);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function RequestForm({
  tool,
  onCancel,
  onSent,
}: {
  tool: RequestedTool;
  onCancel: () => void;
  onSent: () => void;
}) {
  const requestLoan = useMutation(api.loans.request);
  const { pending, error, run } = usePendingAction();
  const today = localToday();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await run(() =>
      requestLoan({ toolId: tool._id, startDate, endDate }),
    );
    if (ok) onSent();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-ink/60">
        {tool.ownerName} will be notified and can approve or decline.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <input
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              if (endDate < event.target.value) setEndDate(event.target.value);
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Until">
          <input
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
