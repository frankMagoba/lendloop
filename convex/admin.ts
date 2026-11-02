import { ConvexError, v } from "convex/values";
import { adminMutation, adminQuery } from "./lib/functions";

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
          listings: tools.filter((tool) => !tool.removedAt).length,
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
