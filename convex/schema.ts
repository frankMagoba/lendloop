import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  auditActionValidator,
  auditTargetValidator,
  automationKindValidator,
  automationStatusValidator,
  categoryValidator,
  conditionValidator,
  deliveryStatusValidator,
  loanEventTypeValidator,
  loanStatusValidator,
  roleValidator,
} from "./lib/validators";

export default defineSchema({
  // Only a first name and email are kept. The email is used solely to
  // address notifications and never leaves Convex except in n8n payloads.
  users: defineTable({
    tokenIdentifier: v.string(),
    firstName: v.string(),
    email: v.optional(v.string()),
    role: roleValidator,
    trustedLender: v.boolean(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    removedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  loans: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatusValidator,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_tool_and_status", ["toolId", "status"])
    .index("by_borrower_and_status", ["borrowerId", "status"])
    .index("by_status_and_end_date", ["status", "endDate"]),

  // Outbox for Convex -> n8n webhooks. The payload is built at send time
  // so no personal data is copied into this table.
  webhookDeliveries: defineTable({
    loanId: v.id("loans"),
    type: loanEventTypeValidator,
    recipientId: v.id("users"),
    status: deliveryStatusValidator,
    attempts: v.number(),
    lastError: v.optional(v.string()),
  }).index("by_status", ["status"]),

  // Append-only record of who changed what. Ids only, so nothing personal
  // is copied; names are looked up when an admin reads it.
  auditLog: defineTable({
    actorId: v.optional(v.id("users")),
    action: auditActionValidator,
    target: auditTargetValidator,
    targetId: v.string(),
    detail: v.optional(v.string()),
  }),

  automationEvents: defineTable({
    loanId: v.id("loans"),
    kind: automationKindValidator,
    status: automationStatusValidator,
    idempotencyKey: v.string(),
    occurredAt: v.number(),
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_loan", ["loanId"]),
});
