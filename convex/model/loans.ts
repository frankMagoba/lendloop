import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { LoanEventType } from "../lib/validators";

export type Availability =
  | { status: "available"; nextBookingFrom: string | null }
  | { status: "on_loan"; dueBack: string; overdue: boolean };

export async function getApprovedLoans(ctx: QueryCtx, toolId: Id<"tools">) {
  return ctx.db
    .query("loans")
    .withIndex("by_tool_and_status", (q) =>
      q.eq("toolId", toolId).eq("status", "approved"),
    )
    .collect();
}

export function describeAvailability(
  approvedLoans: Doc<"loans">[],
  today: string,
): Availability {
  const current = approvedLoans.find((loan) => loan.startDate <= today);
  if (current) {
    return {
      status: "on_loan",
      dueBack: current.endDate,
      overdue: current.endDate < today,
    };
  }
  const upcoming = approvedLoans
    .map((loan) => loan.startDate)
    .sort()
    .at(0);
  return { status: "available", nextBookingFrom: upcoming ?? null };
}

export async function getRecentActivity(ctx: QueryCtx, loanId: Id<"loans">) {
  const events = await ctx.db
    .query("automationEvents")
    .withIndex("by_loan", (q) => q.eq("loanId", loanId))
    .order("desc")
    .take(3);
  return Promise.all(
    events.map(async ({ kind, status, occurredAt, idempotencyKey }) => {
      // Notification keys are "notify:<deliveryId>", which tells us which
      // loan event the email was about.
      const deliveryId =
        kind === "request_notification"
          ? ctx.db.normalizeId(
              "webhookDeliveries",
              idempotencyKey.slice("notify:".length),
            )
          : null;
      const delivery = deliveryId ? await ctx.db.get(deliveryId) : null;
      return {
        kind,
        status,
        occurredAt,
        eventType: delivery?.type ?? null,
      };
    }),
  );
}

export async function enqueueLoanEvent(
  ctx: MutationCtx,
  event: { loanId: Id<"loans">; type: LoanEventType; recipientId: Id<"users"> },
) {
  const deliveryId = await ctx.db.insert("webhookDeliveries", {
    ...event,
    status: "pending",
    attempts: 0,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver, {
    deliveryId,
  });
}

// Used when a listing is removed. Loans that have already started are left
// alone so the owner can still mark the tool as returned.
export async function cancelOutstandingLoans(
  ctx: MutationCtx,
  toolId: Id<"tools">,
  today: string,
) {
  const pending = await ctx.db
    .query("loans")
    .withIndex("by_tool_and_status", (q) =>
      q.eq("toolId", toolId).eq("status", "pending"),
    )
    .collect();
  const upcoming = (await getApprovedLoans(ctx, toolId)).filter(
    (loan) => loan.startDate > today,
  );
  for (const loan of [...pending, ...upcoming]) {
    await ctx.db.patch(loan._id, {
      status: "cancelled",
      decidedAt: Date.now(),
    });
    await enqueueLoanEvent(ctx, {
      loanId: loan._id,
      type: "loan.cancelled",
      recipientId: loan.borrowerId,
    });
  }
}
