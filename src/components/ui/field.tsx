import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink shadow-card transition-[border-color,box-shadow] placeholder:text-ink/35 focus:border-moss/50 focus:ring-4 focus:ring-moss/10 focus:outline-none";

export const textareaClass = `${inputClass} h-auto resize-none py-2.5`;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between text-sm font-medium">
        {label}
        {hint && (
          <span className="text-xs font-normal text-ink/45">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-xl bg-rust-soft px-3.5 py-2.5 text-sm text-rust"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}
