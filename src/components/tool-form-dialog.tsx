"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  CATEGORIES,
  CONDITIONS,
  LIMITS,
  type Category,
  type Condition,
} from "@/convex/lib/validators";
import { usePendingAction } from "@/lib/use-pending-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import {
  Field,
  FormError,
  inputClass,
  textareaClass,
} from "@/components/ui/field";

export type ToolDraft = {
  _id?: Id<"tools">;
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};

export const emptyDraft: ToolDraft = {
  name: "",
  category: "power_tools",
  condition: "good",
  description: "",
};

export function ToolFormDialog({
  draft,
  onClose,
}: {
  draft: ToolDraft | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={draft !== null}
      onClose={onClose}
      title={draft?._id ? "Edit listing" : "List a tool"}
      description="Neighbours see the name, category, condition and description."
    >
      {draft && <ToolForm initial={draft} onDone={onClose} />}
    </Dialog>
  );
}

function ToolForm({
  initial,
  onDone,
}: {
  initial: ToolDraft;
  onDone: () => void;
}) {
  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);
  const { pending, error, run } = usePendingAction();
  const [draft, setDraft] = useState(initial);

  function set<K extends keyof ToolDraft>(key: K, value: ToolDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { _id, ...fields } = draft;
    const ok = await run(() =>
      _id ? updateTool({ toolId: _id, ...fields }) : createTool(fields),
    );
    if (ok) onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name">
        <input
          required
          maxLength={LIMITS.toolName}
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Cordless drill"
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            value={draft.category}
            onChange={(event) =>
              set("category", event.target.value as Category)
            }
            className={inputClass}
          >
            {Object.entries(CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition">
          <select
            value={draft.condition}
            onChange={(event) =>
              set("condition", event.target.value as Condition)
            }
            className={inputClass}
          >
            {Object.entries(CONDITIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="Short description"
        hint={`${draft.description.length}/${LIMITS.description}`}
      >
        <textarea
          rows={3}
          maxLength={LIMITS.description}
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="18V, two batteries, comes with a case of bits"
          className={textareaClass}
        />
      </Field>
      <FormError message={error} />
      <DialogActions>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : draft._id ? "Save changes" : "List tool"}
        </Button>
      </DialogActions>
    </form>
  );
}
