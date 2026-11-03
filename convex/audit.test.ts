import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
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

function auditRows(t: TestConvex) {
  return t.run((ctx) => ctx.db.query("auditLog").collect());
}

describe("audit log", () => {
  test("records who decided on a loan", async () => {
    const t = setup();
    const owner = await createUser(t, "Ada");
    const borrower = await createUser(t, "Ben");
    const toolId = await createTool(t, owner.userId);

    const loanId = await borrower.as.mutation(api.loans.request, {
      toolId,
      startDate: "2026-06-16",
      endDate: "2026-06-17",
    });
    await owner.as.mutation(api.loans.approve, { loanId });

    expect(await auditRows(t)).toMatchObject([
      { actorId: borrower.userId, action: "loan.requested", targetId: loanId },
      { actorId: owner.userId, action: "loan.approved", targetId: loanId },
    ]);
  });

  test("records an admin removal and the requests it cancelled", async () => {
    const t = setup();
    const owner = await createUser(t, "Ada");
    const borrower = await createUser(t, "Ben");
    const admin = await createUser(t, "Ana", { role: "admin" });
    const toolId = await createTool(t, owner.userId);
    const loanId = await createLoan(t, {
      toolId,
      ownerId: owner.userId,
      borrowerId: borrower.userId,
      startDate: "2026-06-18",
      endDate: "2026-06-19",
      status: "pending",
    });

    await admin.as.mutation(api.tools.remove, { toolId });

    expect(await auditRows(t)).toMatchObject([
      {
        actorId: admin.userId,
        action: "tool.removed",
        targetId: toolId,
        detail: "removed by an admin",
      },
      { actorId: admin.userId, action: "loan.cancelled", targetId: loanId },
    ]);
  });

  test("records trust changes and role changes from the CLI", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    const admin = await createUser(t, "Ana", { role: "admin" });

    await admin.as.mutation(api.admin.setTrustedLender, {
      userId: ada.userId,
      trusted: true,
    });
    await t.mutation(internal.users.setRole, {
      email: "ada@example.com",
      role: "admin",
    });

    const [trust, role] = await auditRows(t);
    expect(trust).toMatchObject({
      actorId: admin.userId,
      action: "user.trusted_lender_changed",
    });
    expect(role).toMatchObject({
      action: "user.role_changed",
      detail: "admin",
    });
    expect(role.actorId).toBeUndefined();
  });

  test("only admins can read it, with names resolved", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    const admin = await createUser(t, "Ana", { role: "admin" });
    await admin.as.mutation(api.admin.setTrustedLender, {
      userId: ada.userId,
      trusted: true,
    });

    await expect(ada.as.query(api.admin.auditLog, {})).rejects.toThrow(
      /Only admins/,
    );
    expect(await admin.as.query(api.admin.auditLog, {})).toMatchObject([
      {
        actor: "Ana",
        action: "user.trusted_lender_changed",
        target: "Ada",
        detail: "trusted",
      },
    ]);
  });
});
