import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { buildSignedHeaders } from "./lib/signature";
import {
  TODAY,
  createLoan,
  createTool,
  createUser,
  setup,
  type TestConvex,
} from "./test.setup";

const SECRET = "n8n-to-convex-secret";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
  vi.stubEnv("CONVEX_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function overdueLoan(t: TestConvex) {
  const owner = await createUser(t, "Ada");
  const borrower = await createUser(t, "Ben");
  const toolId = await createTool(t, owner.userId, { name: "Tile saw" });
  const loanId = await createLoan(t, {
    toolId,
    ownerId: owner.userId,
    borrowerId: borrower.userId,
    startDate: "2026-06-01",
    endDate: "2026-06-12",
    status: "approved",
  });
  return { loanId, owner, borrower };
}

async function getOverdue(t: TestConvex, secret = SECRET) {
  return t.fetch("/n8n/overdue-loans", {
    method: "GET",
    headers: await buildSignedHeaders(secret, ""),
  });
}

async function postEvent(t: TestConvex, event: object) {
  const body = JSON.stringify(event);
  return t.fetch("/n8n/automation-events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(await buildSignedHeaders(SECRET, body)),
    },
    body,
  });
}

describe("GET /n8n/overdue-loans", () => {
  test("rejects unsigned and wrongly signed requests", async () => {
    const t = setup();
    expect((await t.fetch("/n8n/overdue-loans")).status).toBe(401);
    expect((await getOverdue(t, "wrong-secret")).status).toBe(401);
  });

  test("returns only the fields the reminder needs", async () => {
    const t = setup();
    const { loanId } = await overdueLoan(t);

    const response = await getOverdue(t);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      loans: [
        {
          loanId,
          idempotencyKey: `overdue:${loanId}:${TODAY}`,
          borrower: { firstName: "Ben", email: "ben@example.com" },
          tool: { name: "Tile saw" },
          dueDate: "2026-06-12",
          daysOverdue: 3,
        },
      ],
    });
  });

  test("ignores loans that are not overdue or already returned", async () => {
    const t = setup();
    const { owner, borrower } = await overdueLoan(t);
    const toolId = await createTool(t, owner.userId);
    const base = { toolId, ownerId: owner.userId, borrowerId: borrower.userId };
    await createLoan(t, {
      ...base,
      startDate: "2026-06-10",
      endDate: TODAY,
      status: "approved",
    });
    await createLoan(t, {
      ...base,
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      status: "returned",
    });

    const { loans } = await (await getOverdue(t)).json();
    expect(loans).toHaveLength(1);
  });

  test("skips loans already reminded today", async () => {
    const t = setup();
    const { loanId } = await overdueLoan(t);
    await postEvent(t, {
      idempotencyKey: `overdue:${loanId}:${TODAY}`,
      loanId,
      kind: "overdue_reminder",
      status: "sent",
    });

    const { loans } = await (await getOverdue(t)).json();
    expect(loans).toEqual([]);
  });
});

describe("POST /n8n/automation-events", () => {
  test("records an event once no matter how often it is retried", async () => {
    const t = setup();
    const { loanId } = await overdueLoan(t);
    const event = {
      idempotencyKey: `overdue:${loanId}:${TODAY}`,
      loanId,
      kind: "overdue_reminder",
      status: "sent",
    };

    const first = await postEvent(t, event);
    const second = await postEvent(t, event);

    expect(first.status).toBe(201);
    expect(await second.json()).toEqual({ result: "duplicate" });
    const rows = await t.run((ctx) =>
      ctx.db.query("automationEvents").collect(),
    );
    expect(rows).toHaveLength(1);
  });

  test("lets a successful retry replace an earlier failure", async () => {
    const t = setup();
    const { loanId } = await overdueLoan(t);
    const event = {
      idempotencyKey: `overdue:${loanId}:${TODAY}`,
      loanId,
      kind: "overdue_reminder",
    };

    await postEvent(t, { ...event, status: "failed" });
    const retry = await postEvent(t, { ...event, status: "sent" });
    const late = await postEvent(t, { ...event, status: "failed" });

    expect(await retry.json()).toEqual({ result: "updated" });
    expect(await late.json()).toEqual({ result: "duplicate" });
    const rows = await t.run((ctx) =>
      ctx.db.query("automationEvents").collect(),
    );
    expect(rows).toMatchObject([{ status: "sent" }]);
  });

  test("shows which loan event a notification was about", async () => {
    const t = setup();
    const { loanId, borrower } = await overdueLoan(t);
    const deliveryId = await t.run((ctx) =>
      ctx.db.insert("webhookDeliveries", {
        loanId,
        type: "loan.approved",
        recipientId: borrower.userId,
        status: "delivered",
        attempts: 1,
      }),
    );

    await postEvent(t, {
      idempotencyKey: `notify:${deliveryId}`,
      loanId,
      kind: "request_notification",
      status: "sent",
    });

    const [loan] = await borrower.as.query(api.loans.myRequests, {});
    expect(loan.activity).toMatchObject([
      { kind: "request_notification", eventType: "loan.approved" },
    ]);
  });

  test("rejects a signed body that was altered in transit", async () => {
    const t = setup();
    const { loanId } = await overdueLoan(t);
    const body = JSON.stringify({
      idempotencyKey: `overdue:${loanId}:${TODAY}`,
      loanId,
      kind: "overdue_reminder",
      status: "sent",
    });
    const headers = await buildSignedHeaders(SECRET, body);

    const response = await t.fetch("/n8n/automation-events", {
      method: "POST",
      headers,
      body: body.replace("sent", "failed"),
    });
    expect(response.status).toBe(401);
  });

  test.each([
    [{ loanId: 42 }, 400],
    [{ loanId: "nope" }, 404],
    [{ idempotencyKey: "notify:abc", kind: "overdue_reminder" }, 400],
    [{ loanId: "jd7a0cdx4rmxyzy7x3yme4n0wd7jnq4c" }, 404],
  ])("rejects bad input %j", async (override, status) => {
    const t = setup();
    const { loanId } = await overdueLoan(t);
    const response = await postEvent(t, {
      idempotencyKey: `overdue:${loanId}:${TODAY}`,
      loanId,
      kind: "overdue_reminder",
      status: "sent",
      ...override,
    });
    expect(response.status).toBe(status);
  });
});
