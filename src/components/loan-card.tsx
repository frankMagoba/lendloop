import type { FunctionReturnType } from "convex/server";
import { BellRing, CalendarDays, Mail, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import type { LoanEventType } from "@/convex/lib/validators";
import { formatRange, localToday, timeAgo } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cardClass } from "@/components/ui/card";

export type LoanView = FunctionReturnType<typeof api.loans.myRequests>[number];

function statusBadge(loan: LoanView): [BadgeTone, string] {
  switch (loan.status) {
    case "pending":
      return ["amber", "Pending"];
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

const emailLabels: Record<LoanEventType, string> = {
  "loan.requested": "Request email",
  "loan.approved": "Approval email",
  "loan.declined": "Decline email",
  "loan.cancelled": "Cancellation email",
  "loan.returned": "Return email",
};

function activityLabel(event: LoanView["activity"][number]) {
  if (event.kind === "overdue_reminder") return "Overdue reminder";
  return event.eventType ? emailLabels[event.eventType] : "Notification";
}

function ActivityIcon({ event }: { event: LoanView["activity"][number] }) {
  if (event.status === "failed") {
    return <TriangleAlert aria-hidden className="size-3.5 text-rust" />;
  }
  const Icon = event.kind === "overdue_reminder" ? BellRing : Mail;
  return <Icon aria-hidden className="size-3.5" />;
}

export function LoanCard({
  loan,
  person,
  actions,
}: {
  loan: LoanView;
  person: ReactNode;
  actions?: ReactNode;
}) {
  const [tone, label] = statusBadge(loan);

  return (
    <li className={cardClass("p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">
              {loan.tool.name}
              {loan.tool.removed && (
                <span className="font-normal text-ink/45"> (removed)</span>
              )}
            </h3>
            <Badge tone={tone} dot>
              {label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5 text-sm text-ink/65">
              <CalendarDays aria-hidden className="size-4 text-ink/40" />
              {formatRange(loan.startDate, loan.endDate)}
            </span>
            {person}
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {loan.activity.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line/70 pt-3 text-xs text-ink/50">
          {loan.activity.map((event) => (
            <li
              key={`${event.kind}-${event.occurredAt}`}
              className="flex items-center gap-2"
            >
              <ActivityIcon event={event} />
              <span>
                {activityLabel(event)}{" "}
                {event.status === "sent" ? (
                  "sent"
                ) : (
                  <span className="text-rust">failed</span>
                )}{" "}
                {timeAgo(event.occurredAt)}
              </span>
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
      <h2 className="flex items-center gap-2 text-sm font-medium text-ink/60">
        {title}
        <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-ink/60">
          {loans.length}
        </span>
      </h2>
      <ul className="space-y-3">{loans.map(render)}</ul>
    </section>
  );
}
