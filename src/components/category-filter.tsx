"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CATEGORIES, type Category } from "@/convex/lib/validators";
import { cn } from "@/lib/cn";
import { CategoryIcon } from "@/components/category-icon";

const CATEGORY_OPTIONS: [Category | null, string][] = [
  [null, "All"],
  ...(Object.entries(CATEGORIES) as [Category, string][]),
];

export function CategoryFilter({ selected }: { selected: Category | null }) {
  const selectedChip = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    selectedChip.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [selected]);

  return (
    <div
      aria-label="Filter by category"
      className="-mx-4 mb-6 flex gap-2 overflow-x-auto [scrollbar-width:none] px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {CATEGORY_OPTIONS.map(([value, label]) => (
        <Link
          key={label}
          ref={selected === value ? selectedChip : undefined}
          href={value ? `/tools?category=${value}` : "/tools"}
          aria-current={selected === value ? "true" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-moss/40 focus-visible:outline-none",
            selected === value
              ? "border-ink bg-ink text-white"
              : "border-line bg-surface text-ink/70 hover:border-ink/25 hover:text-ink",
          )}
        >
          {value && <CategoryIcon category={value} className="size-3.5" />}
          {label}
        </Link>
      ))}
    </div>
  );
}
