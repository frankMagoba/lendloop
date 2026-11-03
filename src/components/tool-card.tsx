import type { FunctionReturnType } from "convex/server";
import { CalendarPlus, Check, Trash2 } from "lucide-react";
import type { api } from "@/convex/_generated/api";
import { CATEGORIES, CONDITIONS } from "@/convex/lib/validators";
import { AvailabilityBadge } from "@/components/availability-badge";
import { CategoryTile } from "@/components/category-icon";
import { Person } from "@/components/person";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";

export type BoardTool = FunctionReturnType<typeof api.tools.list>[number];

export function ToolCard({
  tool,
  canRemove,
  onRequest,
  onRemove,
}: {
  tool: BoardTool;
  canRemove: boolean;
  onRequest: () => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={cardClass(
        "flex min-w-0 flex-col p-5 transition-shadow hover:shadow-raised",
      )}
    >
      <div className="flex items-start gap-3">
        <CategoryTile category={tool.category} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 truncate font-semibold">{tool.name}</h2>
            <AvailabilityBadge availability={tool.availability} />
          </div>
          <p className="mt-0.5 text-[13px] text-ink/55">
            {CATEGORIES[tool.category]} · {CONDITIONS[tool.condition]}
          </p>
        </div>
      </div>

      {tool.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink/75">
          {tool.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line/70 pt-4 [&:not(:first-child)]:mt-4">
        {tool.isMine ? (
          <span className="text-sm text-ink/50">Your listing</span>
        ) : (
          <Person
            firstName={tool.owner.firstName}
            trusted={tool.owner.trustedLender}
          />
        )}
        <div className="ml-auto flex items-center gap-1">
          {canRemove && (
            <Button
              variant="danger"
              size="icon"
              aria-label={`Remove the ${tool.name} listing`}
              title="Remove listing"
              onClick={onRemove}
            >
              <Trash2 />
            </Button>
          )}
          {!tool.isMine &&
            (tool.hasOpenRequest ? (
              <Badge>
                <Check aria-hidden />
                Requested
              </Badge>
            ) : (
              <Button size="sm" variant="accent" onClick={onRequest}>
                <CalendarPlus aria-hidden />
                Request
              </Button>
            ))}
        </div>
      </div>
    </li>
  );
}
