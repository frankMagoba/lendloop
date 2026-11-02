import { cn } from "@/lib/cn";

export function cardClass(className?: string) {
  return cn("rounded-2xl border border-line bg-surface shadow-card", className);
}
