"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CATEGORIES } from "@/convex/lib/validators";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-sand" />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <EmptyState title="Nothing listed yet">
        Be the first on your street to lend something.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li
          key={tool._id}
          className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
        >
          <span className="truncate font-medium">{tool.name}</span>
          <Badge>{CATEGORIES[tool.category]}</Badge>
        </li>
      ))}
    </ul>
  );
}
