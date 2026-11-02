"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, CONDITIONS, type Category } from "@/convex/lib/validators";
import { usePendingAction } from "@/lib/use-pending-action";
import { AvailabilityBadge } from "@/components/availability-badge";
import { CategoryFilter } from "@/components/category-filter";
import { RequestDialog } from "@/components/request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingRows } from "@/components/ui/states";

function parseCategory(value: string | null): Category | null {
  return value && value in CATEGORIES ? (value as Category) : null;
}

export function ToolsBoard() {
  const category = parseCategory(useSearchParams().get("category"));
  const tools = useQuery(api.tools.list, category ? { category } : {});
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
          className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-moss/10 px-4 py-3 text-sm text-moss"
        >
          <span>
            Request for the {sentFor} sent. Follow it under{" "}
            <Link href="/requests" className="font-medium underline">
              My requests
            </Link>
            .
          </span>
          <button
            type="button"
            onClick={() => setSentFor(null)}
            className="text-moss/70 hover:text-moss"
          >
            Dismiss
          </button>
        </div>
      )}

      {tools === undefined ? (
        <LoadingRows />
      ) : tools.length === 0 ? (
        <EmptyState title="No tools here yet">
          {category
            ? "Nothing listed in this category. Try another one."
            : "Nobody has listed anything yet."}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <li
              key={tool._id}
              className="flex flex-col rounded-2xl border border-line p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{tool.name}</h2>
                  <p className="mt-0.5 text-sm text-ink/60">
                    {CATEGORIES[tool.category]} · {CONDITIONS[tool.condition]}
                  </p>
                </div>
                <AvailabilityBadge availability={tool.availability} />
              </div>
              {tool.description && (
                <p className="mt-3 text-sm text-ink/80">{tool.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <span className="flex items-center gap-2 text-sm text-ink/60">
                  {tool.isMine
                    ? "Your listing"
                    : `Lent by ${tool.owner.firstName}`}
                  {tool.owner.trustedLender && (
                    <Badge tone="blue">Trusted Lender</Badge>
                  )}
                </span>
                <div className="flex gap-2">
                  {me?.role === "admin" && !tool.isMine && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={removal.pending}
                      onClick={() => {
                        if (
                          window.confirm(`Remove the ${tool.name} listing?`)
                        ) {
                          removal.run(() => removeTool({ toolId: tool._id }));
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                  {!tool.isMine &&
                    (tool.hasOpenRequest ? (
                      <Badge>Requested</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setRequesting({
                            _id: tool._id,
                            name: tool.name,
                            ownerName: tool.owner.firstName,
                          })
                        }
                      >
                        Request to borrow
                      </Button>
                    ))}
                </div>
              </div>
            </li>
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
