import { v, type Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { daysBetween } from "./lib/dates";
import {
  automationKindValidator,
  automationStatusValidator,
  type AutomationKind,
} from "./lib/validators";

const OVERDUE_BATCH_SIZE = 100;

export const automationEventValidator = v.object({
  idempotencyKey: v.string(),
  loanId: v.string(),
  kind: automationKindValidator,
  status: automationStatusValidator,
});
export type AutomationEventInput = Infer<typeof automationEventValidator>;

const KEY_PREFIX: Record<AutomationKind, string> = {
  request_notification: "notify:",
  overdue_reminder: "overdue:",
};

// One reminder per loan per day. A rerun of the daily workflow reuses the
// same key, so it can never produce a second reminder record.
export function overdueReminderKey(loanId: Id<"loans">, today: string) {
  return `overdue:${loanId}:${today}`;
}

export const overdueLoans = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_and_end_date", (q) =>
        q.eq("status", "approved").lt("endDate", today),
      )
      .take(OVERDUE_BATCH_SIZE);

    const due = [];
    for (const loan of loans) {
      const idempotencyKey = overdueReminderKey(loan._id, today);
      const existing = await ctx.db
        .query("automationEvents")
        .withIndex("by_idempotency_key", (q) =>
          q.eq("idempotencyKey", idempotencyKey),
        )
        .unique();
      if (existing?.status === "sent") continue;

      const borrower = await ctx.db.get(loan.borrowerId);
      if (!borrower?.email) continue;
      const tool = await ctx.db.get(loan.toolId);

      due.push({
        loanId: loan._id,
        idempotencyKey,
        borrower: { firstName: borrower.firstName, email: borrower.email },
        tool: { name: tool?.name ?? "a borrowed tool" },
        dueDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, today),
      });
    }
    return due;
  },
});

export const recordEvent = internalMutation({
  args: automationEventValidator.fields,
  handler: async (ctx, { idempotencyKey, loanId, kind, status }) => {
    if (
      !idempotencyKey.startsWith(KEY_PREFIX[kind]) ||
      idempotencyKey.length > 128
    ) {
      return "invalid_key" as const;
    }
    const id = ctx.db.normalizeId("loans", loanId);
    if (!id || !(await ctx.db.get(id))) return "unknown_loan" as const;

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", idempotencyKey),
      )
      .unique();

    if (existing) {
      // A later success may replace an earlier failure, never the reverse.
      if (existing.status === "failed" && status === "sent") {
        await ctx.db.patch(existing._id, { status, occurredAt: Date.now() });
        return "updated" as const;
      }
      return "duplicate" as const;
    }

    await ctx.db.insert("automationEvents", {
      loanId: id,
      kind,
      status,
      idempotencyKey,
      occurredAt: Date.now(),
    });
    return "created" as const;
  },
});
