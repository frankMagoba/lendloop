import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { formatRange, localToday, timeAgo } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/badge";

export type LoanView = FunctionReturnType<typeof api.loans.myRequests>[number];

function statusBadge(loan: LoanView): [BadgeTone, string] {
  switch (loan.status) {
    case "pending":
      return ["amber", "Waiting for reply"];
    case "approved":
      if (loan.overdue) return ["red", "Overdue"];
      return loan.startDate > localToday()
        ? ["green", "Approved"]
        : ["blue", "On loan"];
    case "declined":
      return ["neutral", "Declined"];
    case "cancelled":
      return ["neutral", "Cancelled"];
    case "returned":
      return ["neutral", "Returned"];
  }
}

const activityLabels = {
  request_notification: "Notification",
  overdue_reminder: "Overdue reminder",
} as const;

export function LoanCard({
  loan,
  subtitle,
  actions,
}: {
  loan: LoanView;
  subtitle: ReactNode;
  actions?: ReactNode;
}) {
  const [tone, label] = statusBadge(loan);

  return (
    <li className="rounded-2xl border border-line p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {loan.tool.name}
              {loan.tool.removed && (
                <span className="font-normal text-ink/50"> (removed)</span>
              )}
            </h3>
            <Badge tone={tone}>{label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-ink/60">
            {formatRange(loan.startDate, loan.endDate)} · {subtitle}
          </p>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {loan.activity.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-ink/50">
          {loan.activity.map((event) => (
            <li key={`${event.kind}-${event.occurredAt}`}>
              {activityLabels[event.kind]}{" "}
              {event.status === "sent" ? (
                "sent"
              ) : (
                <span className="text-rust">failed</span>
              )}{" "}
              {timeAgo(event.occurredAt)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function LoanSection({
  title,
  loans,
  render,
}: {
  title: string;
  loans: LoanView[];
  render: (loan: LoanView) => ReactNode;
}) {
  if (loans.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-ink/60">{title}</h2>
      <ul className="space-y-3">{loans.map(render)}</ul>
    </section>
  );
}
