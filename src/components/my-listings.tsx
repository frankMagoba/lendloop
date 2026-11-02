"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowRight, PackageOpen, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, CONDITIONS } from "@/convex/lib/validators";
import { useAccountReady } from "@/components/account";
import { AvailabilityBadge } from "@/components/availability-badge";
import { CategoryTile } from "@/components/category-icon";
import {
  ToolFormDialog,
  emptyDraft,
  type ToolDraft,
} from "@/components/tool-form-dialog";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui/states";

export function MyListings() {
  const ready = useAccountReady();
  const tools = useQuery(api.tools.mine, ready ? {} : "skip");
  const removeTool = useMutation(api.tools.remove);
  const [draft, setDraft] = useState<ToolDraft | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  function remove(toolId: Id<"tools">, name: string) {
    confirm({
      title: `Remove the ${name}?`,
      description:
        "It disappears from the board. Anyone with a pending or upcoming request is told it was cancelled.",
      confirmLabel: "Remove listing",
      destructive: true,
      action: () => removeTool({ toolId }),
    });
  }

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're happy to lend."
        action={
          <Button onClick={() => setDraft(emptyDraft)}>
            <Plus aria-hidden />
            List a tool
          </Button>
        }
      />
      {tools === undefined ? (
        <LoadingCards count={2} columns={1} />
      ) : tools.length === 0 ? (
        <EmptyState icon={PackageOpen} title="You haven't listed anything yet">
          Lending one thing you rarely use is a good start.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {tools.map((tool) => (
            <li
              key={tool._id}
              className={cardClass("flex flex-wrap items-center gap-4 p-5")}
            >
              <CategoryTile category={tool.category} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{tool.name}</h2>
                  <AvailabilityBadge availability={tool.availability} />
                </div>
                <p className="mt-0.5 truncate text-[13px] text-ink/55">
                  {CATEGORIES[tool.category]} · {CONDITIONS[tool.condition]}
                  {tool.description && ` · ${tool.description}`}
                </p>
                {tool.pendingRequests > 0 && (
                  <Link
                    href="/incoming"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-moss hover:underline"
                  >
                    {tool.pendingRequests} request
                    {tool.pendingRequests === 1 ? "" : "s"} waiting
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                )}
              </div>
              <div className="flex gap-1">
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
                  <Pencil aria-hidden />
                  Edit
                </Button>
                <Button
                  size="icon"
                  variant="danger"
                  aria-label={`Remove the ${tool.name}`}
                  title="Remove listing"
                  onClick={() => remove(tool._id, tool.name)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ToolFormDialog draft={draft} onClose={() => setDraft(null)} />
      {confirmDialog}
    </>
  );
}
