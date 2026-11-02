import { internalMutation } from "./_generated/server";
import { addDays, todayUtc } from "./lib/dates";

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

    const today = todayUtc();
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
