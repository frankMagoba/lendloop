import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { setup } from "./test.setup";

const accounts = [
  {
    tokenIdentifier: "https://example.clerk.accounts.dev|user_owner",
    firstName: "Oscar",
    email: "owner+clerk_test@example.com",
    role: "user" as const,
  },
  {
    tokenIdentifier: "https://example.clerk.accounts.dev|user_admin",
    firstName: "Ada",
    email: "admin+clerk_test@example.com",
    role: "admin" as const,
  },
];

describe("seeding test users", () => {
  test("creates each user with their role", async () => {
    const t = setup();

    await t.mutation(internal.seed.testUsers, { users: accounts });

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(2);
    expect(users.find((u) => u.firstName === "Ada")?.role).toBe("admin");
  });

  test("updates instead of duplicating on a second run", async () => {
    const t = setup();
    await t.mutation(internal.seed.testUsers, { users: accounts });

    await t.mutation(internal.seed.testUsers, {
      users: [{ ...accounts[0], role: "admin" }],
    });

    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(2);
    expect(users.find((u) => u.firstName === "Oscar")?.role).toBe("admin");
  });

  test("a seeded user can sign in and keeps the seeded role", async () => {
    const t = setup();
    await t.mutation(internal.seed.testUsers, { users: accounts });
    const admin = t.withIdentity({
      tokenIdentifier: accounts[1].tokenIdentifier,
      givenName: "Ada",
      email: accounts[1].email,
      emailVerified: true,
    });

    await admin.mutation(api.users.store, {});
    const me = await admin.query(api.users.me, {});

    expect(me).toMatchObject({ firstName: "Ada", role: "admin" });
  });
});
