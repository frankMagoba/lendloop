import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { todayUtc } from "./lib/dates";
import { userMutation, userQuery } from "./lib/functions";
import {
  categoryValidator,
  conditionValidator,
  LIMITS,
} from "./lib/validators";
import { recordAudit } from "./model/audit";
import {
  cancelOutstandingLoans,
  describeAvailability,
  getApprovedLoans,
} from "./model/loans";
import { getListedTool, isListed } from "./model/tools";

const PAGE_SIZE = 200;

const toolFields = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
};

function cleanToolInput<T extends { name: string; description: string }>(
  input: T,
): T {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new ConvexError("Give the tool a name.");
  if (name.length > LIMITS.toolName) {
    throw new ConvexError(`Keep the name under ${LIMITS.toolName} characters.`);
  }
  if (description.length > LIMITS.description) {
    throw new ConvexError(
      `Keep the description under ${LIMITS.description} characters.`,
    );
  }
  return { ...input, name, description };
}

// Signed-out visitors only get name and category, so nothing here can be
// tied back to a neighbour.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const today = todayUtc();
    const tools = await ctx.db.query("tools").order("desc").take(PAGE_SIZE);
    const available = [];
    for (const tool of tools.filter(isListed)) {
      const loans = await getApprovedLoans(ctx, tool._id);
      if (describeAvailability(loans, today).status === "available") {
        available.push({
          _id: tool._id,
          name: tool.name,
          category: tool.category,
        });
      }
    }
    return available;
  },
});

export const list = userQuery({
  args: { category: v.optional(categoryValidator) },
  handler: async (ctx, { category }) => {
    const today = todayUtc();
    const tools = category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", category))
          .order("desc")
          .take(PAGE_SIZE)
      : await ctx.db.query("tools").order("desc").take(PAGE_SIZE);

    const myOpenRequests = new Set<Id<"tools">>();
    for (const status of ["pending", "approved"] as const) {
      const loans = await ctx.db
        .query("loans")
        .withIndex("by_borrower_and_status", (q) =>
          q.eq("borrowerId", ctx.user._id).eq("status", status),
        )
        .collect();
      loans.forEach((loan) => myOpenRequests.add(loan.toolId));
    }

    return Promise.all(
      tools.filter(isListed).map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        const loans = await getApprovedLoans(ctx, tool._id);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          owner: {
            firstName: owner?.firstName ?? "A neighbour",
            trustedLender: owner?.trustedLender ?? false,
          },
          isMine: tool.ownerId === ctx.user._id,
          hasOpenRequest: myOpenRequests.has(tool._id),
          availability: describeAvailability(loans, today),
        };
      }),
    );
  },
});

export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const today = todayUtc();
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.user._id))
      .order("desc")
      .collect();

    return Promise.all(
      tools.filter(isListed).map(async (tool) => {
        const pending = await ctx.db
          .query("loans")
          .withIndex("by_tool_and_status", (q) =>
            q.eq("toolId", tool._id).eq("status", "pending"),
          )
          .collect();
        const loans = await getApprovedLoans(ctx, tool._id);
        return {
          _id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          pendingRequests: pending.length,
          availability: describeAvailability(loans, today),
        };
      }),
    );
  },
});

export const create = userMutation({
  args: toolFields,
  handler: async (ctx, args) => {
    return ctx.db.insert("tools", {
      ...cleanToolInput(args),
      ownerId: ctx.user._id,
    });
  },
});

export const update = userMutation({
  args: { toolId: v.id("tools"), ...toolFields },
  handler: async (ctx, { toolId, ...fields }) => {
    const tool = await getListedTool(ctx, toolId);
    if (tool.ownerId !== ctx.user._id) {
      throw new ConvexError("You can only edit your own listings.");
    }
    await ctx.db.patch(toolId, cleanToolInput(fields));
  },
});

export const remove = userMutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const tool = await getListedTool(ctx, toolId);
    const isOwner = tool.ownerId === ctx.user._id;
    if (!isOwner && ctx.user.role !== "admin") {
      throw new ConvexError("You can only remove your own listings.");
    }

    const today = todayUtc();
    const availability = describeAvailability(
      await getApprovedLoans(ctx, toolId),
      today,
    );
    if (isOwner && availability.status === "on_loan") {
      throw new ConvexError(
        "This tool is out on loan. Mark it returned before removing it.",
      );
    }

    await ctx.db.patch(toolId, { removedAt: Date.now() });
    await recordAudit(ctx, {
      actorId: ctx.user._id,
      action: "tool.removed",
      target: "tool",
      targetId: toolId,
      detail: isOwner ? undefined : "removed by an admin",
    });
    await cancelOutstandingLoans(ctx, {
      toolId,
      actorId: ctx.user._id,
      today,
    });
  },
});
