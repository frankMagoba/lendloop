import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export function isListed(tool: Doc<"tools">) {
  return tool.removedAt === undefined;
}

export async function getListedTool(ctx: QueryCtx, toolId: Id<"tools">) {
  const tool = await ctx.db.get(toolId);
  if (!tool || !isListed(tool)) {
    throw new ConvexError("That tool is no longer listed.");
  }
  return tool;
}
