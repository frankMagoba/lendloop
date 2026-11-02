/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import type { Category } from "./lib/validators";

export const modules = import.meta.glob([
  "./**/*.{js,ts}",
  "!./**/*.test.ts",
  "!./test.setup.ts",
]);

export const TODAY = "2026-06-15";

export function setup() {
  return convexTest(schema, modules);
}

export type TestConvex = ReturnType<typeof setup>;

export async function createUser(
  t: TestConvex,
  firstName: string,
  options: { role?: "admin" | "user"; email?: string | null } = {},
) {
  const tokenIdentifier = `test|${firstName.toLowerCase()}`;
  const email =
    options.email === null
      ? undefined
      : (options.email ?? `${firstName.toLowerCase()}@example.com`);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      tokenIdentifier,
      firstName,
      email,
      role: options.role ?? "user",
      trustedLender: false,
    }),
  );
  return { userId, as: t.withIdentity({ tokenIdentifier }) };
}

export async function createTool(
  t: TestConvex,
  ownerId: Id<"users">,
  overrides: { name?: string; category?: Category } = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("tools", {
      ownerId,
      name: overrides.name ?? "Cordless drill",
      category: overrides.category ?? "power_tools",
      condition: "good",
      description: "18V with two batteries",
    }),
  );
}

export async function createLoan(
  t: TestConvex,
  loan: {
    toolId: Id<"tools">;
    ownerId: Id<"users">;
    borrowerId: Id<"users">;
    startDate: string;
    endDate: string;
    status: "pending" | "approved" | "returned";
  },
) {
  return t.run((ctx) => ctx.db.insert("loans", loan));
}
