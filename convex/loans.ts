import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  addDays,
  daysBetween,
  isIsoDate,
  rangesOverlap,
  todayUtc,
} from "./lib/dates";
import { adminQuery, userMutation, userQuery } from "./lib/functions";
import { LIMITS } from "./lib/validators";
import {
  enqueueLoanEvent,
  getApprovedLoans,
  getRecentActivity,
} from "./model/loans";

function validateRange(startDate: string, endDate: string, today: string) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw new ConvexError("Pick valid start and end dates.");
  }
  // One day of slack: the browser sends a local date, which can sit a day
  // behind UTC for neighbours west of Greenwich.
  if (startDate < addDays(today, -1)) {
    throw new ConvexError("The start date can't be in the past.");
  }
  if (endDate < startDate) {
    throw new ConvexError("The end date must be on or after the start date.");
  }
  if (daysBetween(startDate, endDate) + 1 > LIMITS.loanDays) {
    throw new ConvexError(`Loans can last up to ${LIMITS.loanDays} days.`);
  }
}

async function getLoan(ctx: MutationCtx, loanId: Id<"loans">) {
  const loan = await ctx.db.get(loanId);
  if (!loan) throw new ConvexError("That request no longer exists.");
  return loan;
}

function assertStatus(loan: Doc<"loans">, expected: Doc<"loans">["status"]) {
  if (loan.status !== expected) {
    throw new ConvexError(`This request is already ${loan.status}.`);
  }
}

async function withDetails(ctx: QueryCtx, loan: Doc<"loans">) {
  const [tool, owner, borrower, activity] = await Promise.all([
    ctx.db.get(loan.toolId),
    ctx.db.get(loan.ownerId),
    ctx.db.get(loan.borrowerId),
    getRecentActivity(ctx, loan._id),
  ]);
  return {
    _id: loan._id,
    _creationTime: loan._creationTime,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    overdue: loan.status === "approved" && loan.endDate < todayUtc(),
    tool: { name: tool?.name ?? "Removed tool", removed: !!tool?.removedAt },
    owner: {
      firstName: owner?.firstName ?? "A neighbour",
      trustedLender: owner?.trustedLender ?? false,
    },
    borrower: { firstName: borrower?.firstName ?? "A neighbour" },
    activity,
  };
}

export const request = userMutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const tool = await ctx.db.get(toolId);
    if (!tool || tool.removedAt) {
      throw new ConvexError("That tool is no longer listed.");
    }
    if (tool.ownerId === ctx.user._id) {
      throw new ConvexError("You can't borrow your own tool.");
    }
    validateRange(startDate, endDate, todayUtc());

    const pending = await ctx.db
      .query("loans")
      .withIndex("by_borrower_and_status", (q) =>
        q.eq("borrowerId", ctx.user._id).eq("status", "pending"),
      )
      .collect();
    if (pending.some((loan) => loan.toolId === toolId)) {
      throw new ConvexError("You already have a pending request for this.");
    }
    if (pending.length >= LIMITS.openRequestsPerBorrower) {
      throw new ConvexError(
        "You have too many pending requests. Wait for some replies first.",
      );
    }

    const range = { startDate, endDate };
    const approved = await getApprovedLoans(ctx, toolId);
    if (approved.some((loan) => rangesOverlap(loan, range))) {
      throw new ConvexError("The tool is already booked for those dates.");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: ctx.user._id,
      startDate,
      endDate,
      status: "pending",
    });
    await enqueueLoanEvent(ctx, {
      loanId,
      type: "loan.requested",
      recipientId: tool.ownerId,
    });
    return loanId;
  },
});

export const approve = userMutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const loan = await getLoan(ctx, loanId);
    if (loan.ownerId !== ctx.user._id) {
      throw new ConvexError("Only the tool's owner can approve this.");
    }
    assertStatus(loan, "pending");

    const tool = await ctx.db.get(loan.toolId);
    if (!tool || tool.removedAt) {
      throw new ConvexError("That tool is no longer listed.");
    }
    const approved = await getApprovedLoans(ctx, loan.toolId);
    if (approved.some((other) => rangesOverlap(other, loan))) {
      throw new ConvexError(
        "You've already approved another loan for those dates.",
      );
    }

    await ctx.db.patch(loanId, { status: "approved", decidedAt: Date.now() });
    await enqueueLoanEvent(ctx, {
      loanId,
      type: "loan.approved",
      recipientId: loan.borrowerId,
    });
  },
});

export const decline = userMutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const loan = await getLoan(ctx, loanId);
    if (loan.ownerId !== ctx.user._id) {
      throw new ConvexError("Only the tool's owner can decline this.");
    }
    assertStatus(loan, "pending");

    await ctx.db.patch(loanId, { status: "declined", decidedAt: Date.now() });
    await enqueueLoanEvent(ctx, {
      loanId,
      type: "loan.declined",
      recipientId: loan.borrowerId,
    });
  },
});

export const cancel = userMutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const loan = await getLoan(ctx, loanId);
    if (loan.borrowerId !== ctx.user._id) {
      throw new ConvexError("You can only cancel your own requests.");
    }
    assertStatus(loan, "pending");

    await ctx.db.patch(loanId, { status: "cancelled", decidedAt: Date.now() });
    await enqueueLoanEvent(ctx, {
      loanId,
      type: "loan.cancelled",
      recipientId: loan.ownerId,
    });
  },
});

// Only the lender can close a loan: they are the one who knows the tool
// actually came back.
export const markReturned = userMutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const loan = await getLoan(ctx, loanId);
    if (loan.ownerId !== ctx.user._id) {
      throw new ConvexError("Only the tool's owner can mark it returned.");
    }
    assertStatus(loan, "approved");

    await ctx.db.patch(loanId, { status: "returned", returnedAt: Date.now() });
    await enqueueLoanEvent(ctx, {
      loanId,
      type: "loan.returned",
      recipientId: loan.borrowerId,
    });
  },
});

export const myRequests = userQuery({
  args: {},
  handler: async (ctx) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", ctx.user._id))
      .order("desc")
      .take(100);
    return Promise.all(loans.map((loan) => withDetails(ctx, loan)));
  },
});

export const incoming = userQuery({
  args: {},
  handler: async (ctx) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.user._id))
      .order("desc")
      .take(100);
    return Promise.all(loans.map((loan) => withDetails(ctx, loan)));
  },
});

export const listAll = adminQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const result = await ctx.db
      .query("loans")
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((loan) => withDetails(ctx, loan)),
      ),
    };
  },
});
