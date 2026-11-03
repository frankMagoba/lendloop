import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { addDays, getTodayUtc } from "./lib/dates";
import { roleValidator } from "./lib/validators";
import { recordAudit } from "./model/audit";

// Demo data for local development: `npx convex run seed:demo`.
// The seeded neighbours have no Clerk account, so nobody can sign in as them.
export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("tools").first()) {
      return "Skipped: the database already has tools.";
    }

    const neighbour = (firstName: string) =>
      ctx.db.insert("users", {
        tokenIdentifier: `seed|${firstName.toLowerCase()}`,
        firstName,
        email: `${firstName.toLowerCase()}@example.com`,
        role: "user",
        trustedLender: firstName === "Amara",
      });
    const amara = await neighbour("Amara");
    const tomasz = await neighbour("Tomasz");
    const priya = await neighbour("Priya");

    const tool = (
      ownerId: typeof amara,
      name: string,
      category: "power_tools" | "garden" | "kitchen" | "camping",
      description: string,
    ) =>
      ctx.db.insert("tools", {
        ownerId,
        name,
        category,
        condition: "good",
        description,
      });
    const drill = await tool(
      amara,
      "Cordless drill",
      "power_tools",
      "18V with two batteries and a box of bits.",
    );
    await tool(amara, "Hedge trimmer", "garden", "Electric, 50cm blade.");
    const tent = await tool(
      tomasz,
      "Four-person tent",
      "camping",
      "Pitches in ten minutes. Pegs and mallet included.",
    );
    await tool(tomasz, "Stand mixer", "kitchen", "Comes with a dough hook.");
    await tool(priya, "Pressure washer", "garden", "Hose is 8m long.");

    const today = getTodayUtc();
    await ctx.db.insert("loans", {
      toolId: tent,
      ownerId: tomasz,
      borrowerId: priya,
      startDate: addDays(today, -7),
      endDate: addDays(today, -2),
      status: "approved",
      decidedAt: Date.now(),
    });
    await ctx.db.insert("loans", {
      toolId: drill,
      ownerId: amara,
      borrowerId: tomasz,
      startDate: addDays(today, 2),
      endDate: addDays(today, 4),
      status: "pending",
    });

    return "Seeded 3 neighbours, 5 tools and 2 loans.";
  },
});

// Called by scripts/seed-users.mjs after it creates the Clerk accounts, so
// the test users exist with their role before anyone signs in.
export const testUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        tokenIdentifier: v.string(),
        firstName: v.string(),
        email: v.string(),
        role: roleValidator,
      }),
    ),
  },
  handler: async (ctx, { users }) => {
    for (const user of users) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", user.tokenIdentifier),
        )
        .unique();
      const userId = existing
        ? existing._id
        : await ctx.db.insert("users", { ...user, trustedLender: false });
      if (existing) await ctx.db.patch(existing._id, user);
      if (existing?.role === user.role) continue;

      await recordAudit(ctx, {
        action: "user.role_changed",
        target: "user",
        targetId: userId,
        detail: user.role,
      });
    }
    return users.length;
  },
});
