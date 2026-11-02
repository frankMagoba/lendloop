"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, CONDITIONS } from "@/convex/lib/validators";
import { usePendingAction } from "@/lib/use-pending-action";
import { AvailabilityBadge } from "@/components/availability-badge";
import {
  ToolFormDialog,
  emptyDraft,
  type ToolDraft,
} from "@/components/tool-form-dialog";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/states";

export function MyListings() {
  const tools = useQuery(api.tools.mine);
  const removeTool = useMutation(api.tools.remove);
  const { pending, error, run } = usePendingAction();
  const [draft, setDraft] = useState<ToolDraft | null>(null);

  async function remove(toolId: Id<"tools">, name: string) {
    if (
      !window.confirm(`Remove the ${name}? Open requests will be cancelled.`)
    ) {
      return;
    }
    await run(() => removeTool({ toolId }));
  }

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're happy to lend."
        action={
          <Button onClick={() => setDraft(emptyDraft)}>List a tool</Button>
        }
      />
      <FormError message={error} />

      {tools === undefined ? (
        <LoadingRows />
      ) : tools.length === 0 ? (
        <EmptyState title="You haven't listed anything yet">
          Lending one thing you rarely use is a good start.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {tools.map((tool) => (
            <li
              key={tool._id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{tool.name}</h2>
                  <AvailabilityBadge availability={tool.availability} />
                </div>
                <p className="mt-0.5 text-sm text-ink/60">
                  {CATEGORIES[tool.category]} · {CONDITIONS[tool.condition]}
                </p>
                {tool.pendingRequests > 0 && (
                  <Link
                    href="/incoming"
                    className="mt-2 inline-block text-sm font-medium text-moss underline"
                  >
                    {tool.pendingRequests} request
                    {tool.pendingRequests === 1 ? "" : "s"} waiting
                  </Link>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setDraft({
                      _id: tool._id,
                      name: tool.name,
                      category: tool.category,
                      condition: tool.condition,
                      description: tool.description,
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() => remove(tool._id, tool.name)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ToolFormDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
