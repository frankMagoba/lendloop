"use client";

import { useState, type ReactNode } from "react";
import { usePendingAction } from "@/lib/use-pending-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/field";

export type ConfirmRequest = {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<unknown>;
};

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const dialog = (
    <Dialog
      open={request !== null}
      onClose={() => setRequest(null)}
      title={request?.title ?? ""}
      description={request?.description}
    >
      {request && (
        <ConfirmBody request={request} onDone={() => setRequest(null)} />
      )}
    </Dialog>
  );
  return [setRequest, dialog] as const;
}

function ConfirmBody({
  request,
  onDone,
}: {
  request: ConfirmRequest;
  onDone: () => void;
}) {
  const { pending, error, attempt } = usePendingAction();

  async function confirm() {
    if (await attempt(request.action)) onDone();
  }

  return (
    <>
      <FormError message={error} />
      <DialogActions>
        <Button variant="ghost" onClick={onDone}>
          Go back
        </Button>
        <Button
          variant={request.destructive ? "destructive" : "primary"}
          disabled={pending}
          onClick={confirm}
          autoFocus
        >
          {pending ? "Working…" : request.confirmLabel}
        </Button>
      </DialogActions>
    </>
  );
}
