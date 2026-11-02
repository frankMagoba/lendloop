"use client";

import { useMutation, useQuery } from "convex/react";
import { CircleCheck, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, type Category } from "@/convex/lib/validators";
import { usePendingAction } from "@/lib/use-pending-action";
import { useAccountReady } from "@/components/account";
import { CategoryFilter } from "@/components/category-filter";
import { RequestDialog } from "@/components/request-dialog";
import { ToolCard } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingCards } from "@/components/ui/states";

function parseCategory(value: string | null): Category | null {
  return value && value in CATEGORIES ? (value as Category) : null;
}

export function ToolsBoard() {
  const ready = useAccountReady();
  const category = parseCategory(useSearchParams().get("category"));
  const tools = useQuery(
    api.tools.list,
    ready ? (category ? { category } : {}) : "skip",
  );
  const me = useQuery(api.users.me);
  const removeTool = useMutation(api.tools.remove);
  const removal = usePendingAction();
  const [requesting, setRequesting] = useState<{
    _id: Id<"tools">;
    name: string;
    ownerName: string;
  } | null>(null);
  const [sentFor, setSentFor] = useState<string | null>(null);

  return (
    <>
      <CategoryFilter selected={category} />
      <FormError message={removal.error} />

      {sentFor && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-2xl bg-moss-soft px-4 py-3 text-sm text-moss"
        >
          <CircleCheck aria-hidden className="size-4 shrink-0" />
          <span className="flex-1">
            Request for the {sentFor} sent. Follow it under{" "}
            <Link href="/requests" className="font-medium underline">
              My requests
            </Link>
            .
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss"
            onClick={() => setSentFor(null)}
            className="text-moss hover:bg-moss/10 hover:text-moss"
          >
            <X />
          </Button>
        </div>
      )}

      {tools === undefined ? (
        <LoadingCards />
      ) : tools.length === 0 ? (
        <EmptyState icon={Search} title="No tools here yet">
          {category
            ? "Nothing listed in this category. Try another one."
            : "Nobody has listed anything yet."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool._id}
              tool={tool}
              canRemove={me?.role === "admin" && !tool.isMine}
              removing={removal.pending}
              onRequest={() =>
                setRequesting({
                  _id: tool._id,
                  name: tool.name,
                  ownerName: tool.owner.firstName,
                })
              }
              onRemove={() => {
                if (window.confirm(`Remove the ${tool.name} listing?`)) {
                  removal.run(() => removeTool({ toolId: tool._id }));
                }
              }}
            />
          ))}
        </ul>
      )}

      <RequestDialog
        tool={requesting}
        onClose={() => setRequesting(null)}
        onSent={(name) => setSentFor(name)}
      />
    </>
  );
}
