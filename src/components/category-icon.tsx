import {
  CookingPot,
  Hammer,
  Leaf,
  Package,
  SprayCan,
  Tent,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/convex/lib/validators";
import { cn } from "@/lib/cn";

const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  power_tools: Wrench,
  hand_tools: Hammer,
  garden: Leaf,
  kitchen: CookingPot,
  camping: Tent,
  cleaning: SprayCan,
  other: Package,
};

export function CategoryIcon({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon aria-hidden className={cn("size-4", className)} />;
}

export function CategoryTile({ category }: { category: Category }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand text-ink/70">
      <CategoryIcon category={category} className="size-[18px]" />
    </span>
  );
}
