"use client";

import { useQuery } from "convex/react";
import { PackageOpen } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/convex/lib/validators";
import { CategoryIcon } from "@/components/category-icon";
import { cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <EmptyState icon={PackageOpen} title="Nothing listed yet">
        Be the first on your street to lend something.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li
          key={tool._id}
          className={cardClass("flex items-center gap-3 px-4 py-3")}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sand text-ink/65">
            <CategoryIcon category={tool.category} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{tool.name}</span>
            <span className="block text-[13px] text-ink/50">
              {CATEGORIES[tool.category]}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
