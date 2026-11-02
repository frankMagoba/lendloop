import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";

export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

async function requireUser(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new ConvexError("Please sign in to continue.");
  return user;
}

async function requireAdmin(ctx: QueryCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Only admins can do that.");
  }
  return user;
}

export const userQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await requireUser(ctx) })),
);

export const userMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await requireUser(ctx) })),
);

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => ({ user: await requireAdmin(ctx) })),
);

export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({ user: await requireAdmin(ctx) })),
);
