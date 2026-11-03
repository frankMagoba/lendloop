import { httpRouter } from "convex/server";
import { validate } from "convex-helpers/validators";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { automationEventValidator } from "./automation";
import { getTodayUtc } from "./lib/dates";
import { logEvent } from "./lib/log";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "./lib/signature";

const MAX_BODY_BYTES = 4096;

function respondJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function rejectUnsigned(request: Request, body: string) {
  const secret = process.env.CONVEX_WEBHOOK_SECRET;
  if (!secret) {
    logEvent("error", "config.missing", { name: "CONVEX_WEBHOOK_SECRET" });
    return respondJson({ error: "not configured" }, 503);
  }
  const result = await verify({
    secret,
    timestamp: request.headers.get(TIMESTAMP_HEADER),
    signature: request.headers.get(SIGNATURE_HEADER),
    body,
  });
  if (!result.ok) {
    logEvent("warn", "n8n_request.rejected", {
      path: new URL(request.url).pathname,
      reason: result.reason,
    });
    return respondJson({ error: "invalid signature" }, 401);
  }
  return null;
}

const http = httpRouter();

http.route({
  path: "/n8n/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const rejection = await rejectUnsigned(request, "");
    if (rejection) return rejection;

    const loans = await ctx.runQuery(internal.automation.overdueLoans, {
      today: getTodayUtc(),
    });
    return respondJson({ loans });
  }),
});

http.route({
  path: "/n8n/automation-events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
      return respondJson({ error: "payload too large" }, 413);
    }
    const rejection = await rejectUnsigned(request, body);
    if (rejection) return rejection;

    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return respondJson({ error: "body must be JSON" }, 400);
    }
    if (!validate(automationEventValidator, event)) {
      return respondJson({ error: "unexpected payload shape" }, 400);
    }

    const result = await ctx.runMutation(
      internal.automation.recordEvent,
      event,
    );
    if (result === "unknown_loan") return respondJson({ error: result }, 404);
    if (result === "invalid_key") return respondJson({ error: result }, 400);
    return respondJson({ result }, result === "created" ? 201 : 200);
  }),
});

export default http;
