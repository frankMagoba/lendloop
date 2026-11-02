"use client";

import Link from "next/link";
import { CATEGORIES, type Category } from "@/convex/lib/validators";
import { cn } from "@/lib/cn";

const options: [Category | null, string][] = [
  [null, "All"],
  ...(Object.entries(CATEGORIES) as [Category, string][]),
];

export function CategoryFilter({ selected }: { selected: Category | null }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter by category">
      {options.map(([value, label]) => (
        <Link
          key={label}
          href={value ? `/tools?category=${value}` : "/tools"}
          aria-current={selected === value ? "true" : undefined}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            selected === value
              ? "border-ink bg-ink text-paper"
              : "border-line text-ink/70 hover:border-ink/40",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
