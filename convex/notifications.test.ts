import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "./lib/signature";
import {
  TODAY,
  createLoan,
  createTool,
  createUser,
  setup,
  type TestConvex,
} from "./test.setup";

const SECRET = "convex-to-n8n-secret";
const WEBHOOK_URL = "http://n8n.test/webhook/lendloop-loan-events";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  vi.stubEnv("N8N_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("N8N_LOAN_EVENTS_WEBHOOK_URL", WEBHOOK_URL);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function queuedDelivery(
  t: TestConvex,
  options: { ownerEmail?: string | null } = {},
) {
  const owner = await createUser(t, "Ada", { email: options.ownerEmail });
  const borrower = await createUser(t, "Ben");
  const toolId = await createTool(t, owner.userId, { name: "Ladder" });
  const loanId = await createLoan(t, {
    toolId,
    ownerId: owner.userId,
    borrowerId: borrower.userId,
    startDate: "2026-06-16",
    endDate: "2026-06-17",
    status: "pending",
  });
  const deliveryId = await t.run((ctx) =>
    ctx.db.insert("webhookDeliveries", {
      loanId,
      type: "loan.requested",
      recipientId: owner.userId,
      status: "pending",
      attempts: 0,
    }),
  );
  return { deliveryId, loanId };
}

function getDelivery(t: TestConvex, id: Id<"webhookDeliveries">) {
  return t.run((ctx) => ctx.db.get(id));
}

function scheduledRetries(t: TestConvex) {
  return t.run((ctx) =>
    ctx.db.system
      .query("_scheduled_functions")
      .filter((q) => q.eq(q.field("state.kind"), "pending"))
      .collect(),
  );
}

describe("delivering loan events to n8n", () => {
  test("sends a signed, minimal payload and marks it delivered", async () => {
    const t = setup();
    const { deliveryId, loanId } = await queuedDelivery(t);
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await t.action(internal.notifications.deliver, { deliveryId });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    const body = init?.body as string;
    expect(url).toBe(WEBHOOK_URL);
    expect(JSON.parse(body)).toEqual({
      eventId: deliveryId,
      type: "loan.requested",
      recipientRole: "owner",
      recipient: { firstName: "Ada", email: "ada@example.com" },
      loan: { id: loanId, startDate: "2026-06-16", endDate: "2026-06-17" },
      tool: { name: "Ladder" },
    });
    expect(body).not.toContain("ben@example.com");
    expect(
      await verify({
        secret: SECRET,
        body,
        timestamp: headers[TIMESTAMP_HEADER],
        signature: headers[SIGNATURE_HEADER],
      }),
    ).toEqual({ ok: true });
    expect(await getDelivery(t, deliveryId)).toMatchObject({
      status: "delivered",
      attempts: 1,
    });
  });

  test("schedules a retry when n8n is down", async () => {
    const t = setup();
    const { deliveryId } = await queuedDelivery(t);
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await t.action(internal.notifications.deliver, { deliveryId });

    expect(await getDelivery(t, deliveryId)).toMatchObject({
      status: "pending",
      attempts: 1,
      lastError: "n8n responded with 503",
    });
    expect(await scheduledRetries(t)).toHaveLength(1);
  });

  test("gives up after the last attempt and records the failure", async () => {
    const t = setup();
    const { deliveryId } = await queuedDelivery(t);
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await t.action(internal.notifications.deliver, { deliveryId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(await getDelivery(t, deliveryId)).toMatchObject({
      status: "failed",
      attempts: 5,
      lastError: "connect ECONNREFUSED",
    });
  });

  test("does not retry a request n8n rejected", async () => {
    const t = setup();
    const { deliveryId } = await queuedDelivery(t);
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await t.action(internal.notifications.deliver, { deliveryId });

    expect(await getDelivery(t, deliveryId)).toMatchObject({
      status: "failed",
      attempts: 1,
    });
    expect(await scheduledRetries(t)).toHaveLength(0);
  });

  test("skips the call when n8n is not configured", async () => {
    const t = setup();
    const { deliveryId } = await queuedDelivery(t);
    vi.stubEnv("N8N_LOAN_EVENTS_WEBHOOK_URL", "");

    await t.action(internal.notifications.deliver, { deliveryId });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getDelivery(t, deliveryId)).toMatchObject({
      status: "skipped",
    });
  });

  test("skips the call when the recipient has no email", async () => {
    const t = setup();
    const { deliveryId } = await queuedDelivery(t, { ownerEmail: null });

    await t.action(internal.notifications.deliver, { deliveryId });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getDelivery(t, deliveryId)).toMatchObject({
      status: "skipped",
    });
  });
});
