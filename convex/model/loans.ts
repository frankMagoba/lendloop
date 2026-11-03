import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { LoanEventType } from "../lib/validators";
import { recordAudit } from "./audit";

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

// Every loan change goes through here, so the notification and the audit
// entry are written in the same transaction as the change itself.
export async function recordLoanEvent(
  ctx: MutationCtx,
  event: {
    loanId: Id<"loans">;
    changes?: Partial<Doc<"loans">>;
    type: LoanEventType;
    recipientId: Id<"users">;
    actorId: Id<"users">;
  },
) {
  const { loanId, changes, type, recipientId, actorId } = event;
  if (changes) await ctx.db.patch(loanId, changes);
  const deliveryId = await ctx.db.insert("webhookDeliveries", {
    loanId,
    type,
    recipientId,
    status: "pending",
    attempts: 0,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver, {
    deliveryId,
  });
  await recordAudit(ctx, {
    actorId,
    action: type,
    target: "loan",
    targetId: loanId,
  });
}

// Used when a listing is removed. Loans that have already started are left
// alone so the owner can still mark the tool as returned.
export async function cancelOutstandingLoans(
  ctx: MutationCtx,
  {
    toolId,
    actorId,
    today,
  }: {
    toolId: Id<"tools">;
    actorId: Id<"users">;
    today: string;
  },
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
    await recordLoanEvent(ctx, {
      loanId: loan._id,
      changes: { status: "cancelled", decidedAt: Date.now() },
      type: "loan.cancelled",
      recipientId: loan.borrowerId,
      actorId,
    });
  }
}
