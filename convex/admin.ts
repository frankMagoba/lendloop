import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { adminMutation, adminQuery } from "./lib/functions";
import { recordAudit } from "./model/audit";
import { isListed } from "./model/tools";

const AUDIT_PAGE_SIZE = 30;

export const users = adminQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").order("desc").take(200);
    return Promise.all(
      users.map(async (user) => {
        const tools = await ctx.db
          .query("tools")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .collect();
        return {
          _id: user._id,
          firstName: user.firstName,
          role: user.role,
          trustedLender: user.trustedLender,
          listings: tools.filter(isListed).length,
        };
      }),
    );
  },
});

export const setTrustedLender = adminMutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("That neighbour no longer exists.");
    await ctx.db.patch(userId, { trustedLender: trusted });
    await recordAudit(ctx, {
      actorId: ctx.user._id,
      action: "user.trusted_lender_changed",
      target: "user",
      targetId: userId,
      detail: trusted ? "trusted" : "not trusted",
    });
  },
});

export const failedDeliveries = adminQuery({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(20);
    return failed.map(({ _id, _creationTime, type, attempts, lastError }) => ({
      _id,
      _creationTime,
      type,
      attempts,
      lastError,
    }));
  },
});

async function describeAuditTarget(ctx: QueryCtx, entry: Doc<"auditLog">) {
  if (entry.target === "user") {
    const id = ctx.db.normalizeId("users", entry.targetId);
    return (id && (await ctx.db.get(id))?.firstName) || "a neighbour";
  }
  const toolId =
    entry.target === "tool"
      ? ctx.db.normalizeId("tools", entry.targetId)
      : (await getLoanById(ctx, entry.targetId))?.toolId;
  return (toolId && (await ctx.db.get(toolId))?.name) || "a tool";
}

async function getLoanById(ctx: QueryCtx, loanId: string) {
  const id = ctx.db.normalizeId("loans", loanId);
  return id ? ctx.db.get(id) : null;
}

export const auditLog = adminQuery({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("auditLog")
      .order("desc")
      .take(AUDIT_PAGE_SIZE);
    return Promise.all(
      entries.map(async (entry) => {
        const actor = entry.actorId ? await ctx.db.get(entry.actorId) : null;
        return {
          _id: entry._id,
          _creationTime: entry._creationTime,
          action: entry.action,
          detail: entry.detail,
          actor: entry.actorId ? (actor?.firstName ?? "A neighbour") : "CLI",
          target: await describeAuditTarget(ctx, entry),
        };
      }),
    );
  },
});
