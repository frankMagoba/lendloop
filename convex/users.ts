import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/functions";
import { roleValidator } from "./lib/validators";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Please sign in to continue.");

    const firstName =
      identity.givenName ?? identity.name?.split(" ")[0] ?? "Neighbour";
    const email = identity.email;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (existing) {
      if (existing.firstName !== firstName || existing.email !== email) {
        await ctx.db.patch(existing._id, { firstName, email });
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      firstName,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      firstName: user.firstName,
      role: user.role,
      trustedLender: user.trustedLender,
    };
  },
});

// Internal on purpose: roles are granted from the Convex CLI or dashboard,
// so there is no client-callable path to promote yourself.
export const setRole = internalMutation({
  args: { email: v.string(), role: roleValidator },
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new ConvexError(`No user with email ${email}`);
    await ctx.db.patch(user._id, { role });
    return user._id;
  },
});
