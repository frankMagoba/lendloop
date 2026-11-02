import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-ink/60">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-sand text-ink/55">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="mt-4 font-medium">{title}</p>
      {children && (
        <div className="mt-1.5 max-w-sm text-sm text-ink/60">{children}</div>
      )}
    </div>
  );
}

export function LoadingCards({
  count = 4,
  columns = 2,
}: {
  count?: number;
  columns?: 1 | 2;
}) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={
        columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid grid-cols-1 gap-3"
      }
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-line bg-surface"
        >
          <div className="m-5 flex gap-3">
            <div className="size-10 rounded-xl bg-sand" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3.5 w-2/5 rounded bg-sand" />
              <div className="h-3 w-1/4 rounded bg-sand" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
