#!/usr/bin/env node
// Creates ready-to-use test accounts in a Clerk development instance and
// the matching Convex users. Safe to run again: existing accounts get a
// fresh password instead of a duplicate.
//
//   npm run seed:users
//
// Set SEED_PASSWORD to choose the password instead of generating one.

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

const CLERK_API = "https://api.clerk.com/v1";

const ACCOUNTS = [
  { email: "owner+clerk_test@example.com", firstName: "Oscar", role: "user" },
  { email: "borrower+clerk_test@example.com", firstName: "Bea", role: "user" },
  { email: "admin+clerk_test@example.com", firstName: "Ada", role: "admin" },
];

function fail(message) {
  console.error(`seed:users: ${message}`);
  process.exit(1);
}

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!secretKey || !publishableKey) {
  fail("CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be set.");
}
// Test accounts with a printed password have no place in production.
if (
  !secretKey.startsWith("sk_test_") ||
  !publishableKey.startsWith("pk_test_")
) {
  fail("refusing to run: this only works with Clerk development keys.");
}

// The publishable key is the base64 Frontend API host followed by "$".
// Convex identifies Clerk users as "<issuer>|<user id>".
function getIssuerFromKey(key) {
  const host = Buffer.from(key.split("_")[2], "base64")
    .toString("utf8")
    .replace(/\$$/, "");
  return `https://${host}`;
}

async function callClerk(path, init = {}) {
  const response = await fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
  });
  const body = await response.json();
  if (!response.ok) {
    const reason = body.errors?.map((e) => e.long_message).join(" ");
    fail(`Clerk ${init.method ?? "GET"} ${path} failed: ${reason}`);
  }
  return body;
}

async function upsertClerkUser(account, password) {
  const query = new URLSearchParams({ email_address: account.email });
  const [existing] = await callClerk(`/users?${query}`);
  const fields = { password, skip_password_checks: true };
  if (existing) {
    await callClerk(`/users/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    return { id: existing.id, created: false };
  }
  const user = await callClerk("/users", {
    method: "POST",
    body: JSON.stringify({
      ...fields,
      email_address: [account.email],
      first_name: account.firstName,
      last_name: "Test",
    }),
  });
  return { id: user.id, created: true };
}

const password =
  process.env.SEED_PASSWORD ?? `ll-${randomBytes(9).toString("base64url")}`;
const issuer = getIssuerFromKey(publishableKey);

const results = [];
for (const account of ACCOUNTS) {
  results.push({ ...account, ...(await upsertClerkUser(account, password)) });
}

const convexUsers = results.map((user) => ({
  tokenIdentifier: `${issuer}|${user.id}`,
  firstName: user.firstName,
  email: user.email,
  role: user.role,
}));
try {
  // Calling the CLI through node avoids shell quoting of the JSON argument.
  execFileSync(
    process.execPath,
    [
      "node_modules/convex/bin/main.js",
      "run",
      "seed:testUsers",
      JSON.stringify({ users: convexUsers }),
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
} catch {
  fail(
    "Clerk accounts are ready, but writing them to Convex failed. Is `npx convex dev` running?",
  );
}

console.log("\nTest accounts (Clerk development instance):\n");
console.table(
  results.map(({ email, firstName, role, created }) => ({
    email,
    name: firstName,
    role,
    status: created ? "created" : "password reset",
  })),
);
console.log(`Password for all three: ${password}`);
console.log(
  "If Clerk asks for an email code on these addresses, use 424242.\n",
);
