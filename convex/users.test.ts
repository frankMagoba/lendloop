import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setup } from "./test.setup";

const identity = {
  tokenIdentifier: "clerk|user_1",
  givenName: "Dana",
  name: "Dana Scully",
  email: "dana@example.com",
};

describe("storing the signed-in user", () => {
  test("creates a plain user with only a first name and email", async () => {
    const t = setup();
    const as = t.withIdentity({ ...identity, emailVerified: true });

    const userId = await as.mutation(api.users.store, {});

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user).toMatchObject({
      firstName: "Dana",
      email: "dana@example.com",
      role: "user",
      trustedLender: false,
    });
  });

  test("does not keep an email Clerk has not verified", async () => {
    const t = setup();
    const as = t.withIdentity({ ...identity, emailVerified: false });

    const userId = await as.mutation(api.users.store, {});

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.email).toBeUndefined();
  });

  test("never changes the role on a later sign-in", async () => {
    const t = setup();
    const as = t.withIdentity(identity);
    const userId = await as.mutation(api.users.store, {});
    await t.run((ctx) => ctx.db.patch(userId, { role: "admin" }));

    await as.mutation(api.users.store, {});

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.role).toBe("admin");
  });
});
