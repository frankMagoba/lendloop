import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { signedHeaders } from "./lib/signature";

export const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000];
const REQUEST_TIMEOUT_MS = 10_000;

// Everything n8n needs to write one message, and nothing more: no user ids,
// no other party's details, no free text from the request.
export const buildPayload = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery || delivery.status !== "pending") return null;

    const loan = await ctx.db.get(delivery.loanId);
    const recipient = await ctx.db.get(delivery.recipientId);
    if (!loan || !recipient) return null;
    const tool = await ctx.db.get(loan.toolId);

    return {
      eventId: delivery._id,
      type: delivery.type,
      recipientRole: recipient._id === loan.ownerId ? "owner" : "borrower",
      recipient: { firstName: recipient.firstName, email: recipient.email },
      loan: {
        id: loan._id,
        startDate: loan.startDate,
        endDate: loan.endDate,
      },
      tool: { name: tool?.name ?? "a tool" },
    };
  },
});

export const deliver = internalAction({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const payload = await ctx.runQuery(internal.notifications.buildPayload, {
      deliveryId,
    });
    if (!payload) return;

    const url = process.env.N8N_LOAN_EVENTS_WEBHOOK_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;
    if (!url || !secret) {
      await ctx.runMutation(internal.notifications.markSkipped, {
        deliveryId,
        reason: "n8n webhook is not configured",
      });
      return;
    }
    if (!payload.recipient.email) {
      await ctx.runMutation(internal.notifications.markSkipped, {
        deliveryId,
        reason: "recipient has no email address",
      });
      return;
    }

    const body = JSON.stringify(payload);
    let error: string;
    let retryable = true;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await signedHeaders(secret, body)),
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        await ctx.runMutation(internal.notifications.markDelivered, {
          deliveryId,
        });
        return;
      }
      error = `n8n responded with ${response.status}`;
      // A 4xx means the request itself is wrong (bad signature, bad URL),
      // so retrying the same bytes would only fail again.
      retryable =
        response.status >= 500 ||
        response.status === 408 ||
        response.status === 429;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    await ctx.runMutation(internal.notifications.recordFailure, {
      deliveryId,
      error,
      retryable,
    });
  },
});

export const markDelivered = internalMutation({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery) return;
    await ctx.db.patch(deliveryId, {
      status: "delivered",
      attempts: delivery.attempts + 1,
      lastError: undefined,
    });
  },
});

export const markSkipped = internalMutation({
  args: { deliveryId: v.id("webhookDeliveries"), reason: v.string() },
  handler: async (ctx, { deliveryId, reason }) => {
    console.warn(`Webhook ${deliveryId} skipped: ${reason}`);
    await ctx.db.patch(deliveryId, { status: "skipped", lastError: reason });
  },
});

export const recordFailure = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"),
    error: v.string(),
    retryable: v.boolean(),
  },
  handler: async (ctx, { deliveryId, error, retryable }) => {
    const delivery = await ctx.db.get(deliveryId);
    if (!delivery) return;

    const attempts = delivery.attempts + 1;
    if (retryable && attempts < MAX_ATTEMPTS) {
      await ctx.db.patch(deliveryId, { attempts, lastError: error });
      await ctx.scheduler.runAfter(
        RETRY_DELAYS_MS[attempts - 1],
        internal.notifications.deliver,
        { deliveryId },
      );
      return;
    }

    console.error(
      `Webhook ${deliveryId} failed after ${attempts} attempt(s): ${error}`,
    );
    await ctx.db.patch(deliveryId, {
      status: "failed",
      attempts,
      lastError: error,
    });
  },
});
