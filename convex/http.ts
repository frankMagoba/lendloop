import { httpRouter } from "convex/server";
import { validate } from "convex-helpers/validators";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { automationEventValidator } from "./automation";
import { todayUtc } from "./lib/dates";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "./lib/signature";

const MAX_BODY_BYTES = 4096;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function rejectUnsigned(request: Request, body: string) {
  const secret = process.env.CONVEX_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CONVEX_WEBHOOK_SECRET is not set");
    return json({ error: "not configured" }, 503);
  }
  const result = await verify({
    secret,
    timestamp: request.headers.get(TIMESTAMP_HEADER),
    signature: request.headers.get(SIGNATURE_HEADER),
    body,
  });
  if (!result.ok) {
    console.warn(
      `Rejected n8n request to ${new URL(request.url).pathname}: ${result.reason}`,
    );
    return json({ error: "invalid signature" }, 401);
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
      today: todayUtc(),
    });
    return json({ loans });
  }),
});

http.route({
  path: "/n8n/automation-events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
      return json({ error: "payload too large" }, 413);
    }
    const rejection = await rejectUnsigned(request, body);
    if (rejection) return rejection;

    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return json({ error: "body must be JSON" }, 400);
    }
    if (!validate(automationEventValidator, event)) {
      return json({ error: "unexpected payload shape" }, 400);
    }

    const result = await ctx.runMutation(
      internal.automation.recordEvent,
      event,
    );
    if (result === "unknown_loan") return json({ error: result }, 404);
    if (result === "invalid_key") return json({ error: result }, 400);
    return json({ result }, result === "created" ? 201 : 200);
  }),
});

export default http;
