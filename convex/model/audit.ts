import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { AuditAction, auditTargetValidator } from "../lib/validators";

export async function recordAudit(
  ctx: MutationCtx,
  entry: {
    actorId?: Id<"users">;
    action: AuditAction;
    target: Infer<typeof auditTargetValidator>;
    targetId: string;
    detail?: string;
  },
) {
  await ctx.db.insert("auditLog", entry);
}
