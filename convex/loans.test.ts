import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import {
  TODAY,
  createLoan,
  createTool,
  createUser,
  setup,
  type TestConvex,
} from "./test.setup";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
});

async function neighbours(t: TestConvex) {
  const owner = await createUser(t, "Ada");
  const borrower = await createUser(t, "Ben");
  const stranger = await createUser(t, "Cy");
  const toolId = await createTool(t, owner.userId);
  return { owner, borrower, stranger, toolId };
}

const range = { startDate: "2026-06-16", endDate: "2026-06-18" };

describe("requesting a tool", () => {
  test("creates a pending loan and queues a notification for the owner", async () => {
    const t = setup();
    const { owner, borrower, toolId } = await neighbours(t);

    const loanId = await borrower.as.mutation(api.loans.request, {
      toolId,
      ...range,
    });

    const [loan, deliveries] = await t.run(async (ctx) => [
      await ctx.db.get(loanId),
      await ctx.db.query("webhookDeliveries").collect(),
    ]);
    expect(loan).toMatchObject({ status: "pending", ownerId: owner.userId });
    expect(deliveries).toMatchObject([
      { type: "loan.requested", recipientId: owner.userId, status: "pending" },
    ]);
  });

  test("an owner cannot borrow their own tool", async () => {
    const t = setup();
    const { owner, toolId } = await neighbours(t);
    await expect(
      owner.as.mutation(api.loans.request, { toolId, ...range }),
    ).rejects.toThrow(/your own tool/);
  });

  test.each([
    [{ startDate: "2026-06-10", endDate: "2026-06-12" }, /past/],
    [{ startDate: "2026-06-18", endDate: "2026-06-16" }, /on or after/],
    [{ startDate: "2026-06-16", endDate: "2026-08-01" }, /up to 30 days/],
    [{ startDate: "2026-02-30", endDate: "2026-03-01" }, /valid/],
  ])("rejects the date range %j", async (dates, message) => {
    const t = setup();
    const { borrower, toolId } = await neighbours(t);
    await expect(
      borrower.as.mutation(api.loans.request, { toolId, ...dates }),
    ).rejects.toThrow(message);
  });

  test("rejects dates that clash with an approved loan", async () => {
    const t = setup();
    const { owner, borrower, stranger, toolId } = await neighbours(t);
    await createLoan(t, {
      toolId,
      ownerId: owner.userId,
      borrowerId: stranger.userId,
      startDate: "2026-06-17",
      endDate: "2026-06-20",
      status: "approved",
    });

    await expect(
      borrower.as.mutation(api.loans.request, { toolId, ...range }),
    ).rejects.toThrow(/already booked/);
  });

  test("rejects a second pending request for the same tool", async () => {
    const t = setup();
    const { borrower, toolId } = await neighbours(t);
    await borrower.as.mutation(api.loans.request, { toolId, ...range });
    await expect(
      borrower.as.mutation(api.loans.request, { toolId, ...range }),
    ).rejects.toThrow(/pending request/);
  });
});

describe("deciding on a request", () => {
  async function pendingLoan(t: TestConvex) {
    const people = await neighbours(t);
    const loanId = await people.borrower.as.mutation(api.loans.request, {
      toolId: people.toolId,
      ...range,
    });
    return { ...people, loanId };
  }

  test("only the owner can approve or decline", async () => {
    const t = setup();
    const { borrower, stranger, loanId } = await pendingLoan(t);
    const admin = await createUser(t, "Ana", { role: "admin" });

    for (const caller of [borrower, stranger, admin]) {
      await expect(
        caller.as.mutation(api.loans.approve, { loanId }),
      ).rejects.toThrow(/owner/);
      await expect(
        caller.as.mutation(api.loans.decline, { loanId }),
      ).rejects.toThrow(/owner/);
    }
  });

  test("approving notifies the borrower", async () => {
    const t = setup();
    const { owner, borrower, loanId } = await pendingLoan(t);

    await owner.as.mutation(api.loans.approve, { loanId });

    const deliveries = await t.run((ctx) =>
      ctx.db.query("webhookDeliveries").collect(),
    );
    expect(deliveries.at(-1)).toMatchObject({
      type: "loan.approved",
      recipientId: borrower.userId,
    });
  });

  test("cannot approve two loans for overlapping dates", async () => {
    const t = setup();
    const { owner, stranger, toolId, loanId } = await pendingLoan(t);
    const clashing = await stranger.as.mutation(api.loans.request, {
      toolId,
      startDate: "2026-06-18",
      endDate: "2026-06-19",
    });

    await owner.as.mutation(api.loans.approve, { loanId });
    await expect(
      owner.as.mutation(api.loans.approve, { loanId: clashing }),
    ).rejects.toThrow(/already approved/);
  });

  test("cannot approve while the tool is still out on an overdue loan", async () => {
    const t = setup();
    const { owner, stranger, toolId, loanId } = await pendingLoan(t);
    await createLoan(t, {
      toolId,
      ownerId: owner.userId,
      borrowerId: stranger.userId,
      startDate: "2026-06-01",
      endDate: "2026-06-10",
      status: "approved",
    });

    await expect(
      owner.as.mutation(api.loans.approve, { loanId }),
    ).rejects.toThrow(/hasn't come back/);
  });

  test("a decided request cannot be decided again", async () => {
    const t = setup();
    const { owner, loanId } = await pendingLoan(t);
    await owner.as.mutation(api.loans.decline, { loanId });
    await expect(
      owner.as.mutation(api.loans.approve, { loanId }),
    ).rejects.toThrow(/already declined/);
  });

  test("only the borrower can cancel their pending request", async () => {
    const t = setup();
    const { owner, borrower, loanId } = await pendingLoan(t);

    await expect(
      owner.as.mutation(api.loans.cancel, { loanId }),
    ).rejects.toThrow(/your own requests/);
    await borrower.as.mutation(api.loans.cancel, { loanId });

    const loan = await t.run((ctx) => ctx.db.get(loanId));
    expect(loan?.status).toBe("cancelled");
  });
});

describe("returning a tool", () => {
  test("only the owner can mark an approved loan returned", async () => {
    const t = setup();
    const { owner, borrower, toolId } = await neighbours(t);
    const loanId = await createLoan(t, {
      toolId,
      ownerId: owner.userId,
      borrowerId: borrower.userId,
      startDate: "2026-06-10",
      endDate: "2026-06-12",
      status: "approved",
    });

    await expect(
      borrower.as.mutation(api.loans.markReturned, { loanId }),
    ).rejects.toThrow(/owner/);
    await owner.as.mutation(api.loans.markReturned, { loanId });

    const loan = await t.run((ctx) => ctx.db.get(loanId));
    expect(loan).toMatchObject({ status: "returned" });
    expect(loan?.returnedAt).toBeDefined();
  });
});

describe("loan views", () => {
  test("each side only sees their own loans", async () => {
    const t = setup();
    const { owner, borrower, stranger, toolId } = await neighbours(t);
    await borrower.as.mutation(api.loans.request, { toolId, ...range });

    expect(await borrower.as.query(api.loans.myRequests, {})).toHaveLength(1);
    expect(await owner.as.query(api.loans.incoming, {})).toHaveLength(1);
    expect(await stranger.as.query(api.loans.myRequests, {})).toHaveLength(0);
    expect(await stranger.as.query(api.loans.incoming, {})).toHaveLength(0);
  });

  test("only admins can list every loan", async () => {
    const t = setup();
    const { borrower, toolId } = await neighbours(t);
    const admin = await createUser(t, "Ana", { role: "admin" });
    await borrower.as.mutation(api.loans.request, { toolId, ...range });
    const paginationOpts = { numItems: 10, cursor: null };

    await expect(
      borrower.as.query(api.loans.listAll, { paginationOpts }),
    ).rejects.toThrow(/Only admins/);
    const all = await admin.as.query(api.loans.listAll, { paginationOpts });
    expect(all.page).toHaveLength(1);
  });
});

describe("admin actions", () => {
  test("only admins can mark a trusted lender", async () => {
    const t = setup();
    const { owner, borrower } = await neighbours(t);
    const admin = await createUser(t, "Ana", { role: "admin" });

    await expect(
      borrower.as.mutation(api.admin.setTrustedLender, {
        userId: borrower.userId,
        trusted: true,
      }),
    ).rejects.toThrow(/Only admins/);
    await admin.as.mutation(api.admin.setTrustedLender, {
      userId: owner.userId,
      trusted: true,
    });

    const user = await t.run((ctx) => ctx.db.get(owner.userId));
    expect(user?.trustedLender).toBe(true);
  });
});
