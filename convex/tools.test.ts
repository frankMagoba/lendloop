import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { TODAY, createLoan, createTool, createUser, setup } from "./test.setup";

const newTool = {
  name: "Hedge trimmer",
  category: "garden",
  condition: "good",
  description: "Electric, 50cm blade",
} as const;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("public tool list", () => {
  test("shows only name and category of tools that are free today", async () => {
    const t = setup();
    const owner = await createUser(t, "Ada");
    const borrower = await createUser(t, "Ben");
    const free = await createTool(t, owner.userId, { name: "Ladder" });
    const lent = await createTool(t, owner.userId, { name: "Drill" });
    await createLoan(t, {
      toolId: lent,
      ownerId: owner.userId,
      borrowerId: borrower.userId,
      startDate: "2026-06-14",
      endDate: "2026-06-20",
      status: "approved",
    });

    const tools = await t.query(api.tools.listPublic, {});

    expect(tools).toEqual([
      { _id: free, name: "Ladder", category: "power_tools" },
    ]);
  });
});

describe("listing tools", () => {
  test("requires a signed-in user", async () => {
    const t = setup();
    await expect(t.mutation(api.tools.create, newTool)).rejects.toThrow(
      /sign in/,
    );
  });

  test("assigns the listing to the caller and trims input", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");

    const toolId = await ada.as.mutation(api.tools.create, {
      ...newTool,
      name: "  Hedge trimmer  ",
    });

    const tool = await t.run((ctx) => ctx.db.get(toolId));
    expect(tool).toMatchObject({ ownerId: ada.userId, name: "Hedge trimmer" });
  });

  test("rejects an empty name", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    await expect(
      ada.as.mutation(api.tools.create, { ...newTool, name: "   " }),
    ).rejects.toThrow(/name/);
  });

  test("filters the signed-in list by category", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    await createTool(t, ada.userId, { name: "Rake", category: "garden" });
    await createTool(t, ada.userId, { name: "Drill" });

    const garden = await ada.as.query(api.tools.list, { category: "garden" });

    expect(garden.map((tool) => tool.name)).toEqual(["Rake"]);
    expect(garden[0]).toMatchObject({
      isMine: true,
      availability: { status: "available" },
    });
  });
});

describe("editing and removing listings", () => {
  test("only the owner can edit a listing", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    const ben = await createUser(t, "Ben");
    const admin = await createUser(t, "Ana", { role: "admin" });
    const toolId = await createTool(t, ada.userId);

    for (const caller of [ben, admin]) {
      await expect(
        caller.as.mutation(api.tools.update, { toolId, ...newTool }),
      ).rejects.toThrow(/your own listings/);
    }
    await ada.as.mutation(api.tools.update, { toolId, ...newTool });
    const tool = await t.run((ctx) => ctx.db.get(toolId));
    expect(tool?.name).toBe(newTool.name);
  });

  test("another user cannot remove a listing", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    const ben = await createUser(t, "Ben");
    const toolId = await createTool(t, ada.userId);

    await expect(ben.as.mutation(api.tools.remove, { toolId })).rejects.toThrow(
      /your own listings/,
    );
  });

  test("an admin can remove any listing and open requests are cancelled", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    const ben = await createUser(t, "Ben");
    const admin = await createUser(t, "Ana", { role: "admin" });
    const toolId = await createTool(t, ada.userId);
    const loanId = await createLoan(t, {
      toolId,
      ownerId: ada.userId,
      borrowerId: ben.userId,
      startDate: "2026-06-18",
      endDate: "2026-06-19",
      status: "pending",
    });

    await admin.as.mutation(api.tools.remove, { toolId });

    const [tool, loan] = await t.run(async (ctx) => [
      await ctx.db.get(toolId),
      await ctx.db.get(loanId),
    ]);
    expect(tool?.removedAt).toBeDefined();
    expect(loan?.status).toBe("cancelled");
    expect(await ada.as.query(api.tools.mine, {})).toEqual([]);
  });

  test("an owner cannot remove a tool that is out on loan", async () => {
    const t = setup();
    const ada = await createUser(t, "Ada");
    const ben = await createUser(t, "Ben");
    const toolId = await createTool(t, ada.userId);
    await createLoan(t, {
      toolId,
      ownerId: ada.userId,
      borrowerId: ben.userId,
      startDate: "2026-06-10",
      endDate: "2026-06-16",
      status: "approved",
    });

    await expect(ada.as.mutation(api.tools.remove, { toolId })).rejects.toThrow(
      /out on loan/,
    );
  });
});
