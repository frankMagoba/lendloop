import { describe, expect, test } from "vitest";
import {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  sign,
  signedHeaders,
  verify,
} from "./lib/signature";

const secret = "test-secret";
const body = JSON.stringify({ hello: "world" });
const now = Date.parse("2026-06-15T10:00:00Z");

describe("webhook signatures", () => {
  test("accepts a request signed with the shared secret", async () => {
    const headers = await signedHeaders(secret, body, now);
    const result = await verify({
      secret,
      body,
      now,
      timestamp: headers[TIMESTAMP_HEADER],
      signature: headers[SIGNATURE_HEADER],
    });
    expect(result).toEqual({ ok: true });
  });

  test("matches an HMAC computed independently", async () => {
    // Same algorithm the n8n Code nodes use via node:crypto.
    const { createHmac } = await import("node:crypto");
    const timestamp = "1781517600";
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
    expect(await sign(secret, timestamp, body)).toBe(`v1=${expected}`);
  });

  test("rejects a tampered body", async () => {
    const headers = await signedHeaders(secret, body, now);
    const result = await verify({
      secret,
      body: body.replace("world", "there"),
      now,
      timestamp: headers[TIMESTAMP_HEADER],
      signature: headers[SIGNATURE_HEADER],
    });
    expect(result).toEqual({ ok: false, reason: "mismatch" });
  });

  test("rejects a signature made with another secret", async () => {
    const headers = await signedHeaders("other-secret", body, now);
    const result = await verify({
      secret,
      body,
      now,
      timestamp: headers[TIMESTAMP_HEADER],
      signature: headers[SIGNATURE_HEADER],
    });
    expect(result).toEqual({ ok: false, reason: "mismatch" });
  });

  test("rejects a replay outside the five minute window", async () => {
    const headers = await signedHeaders(secret, body, now);
    const result = await verify({
      secret,
      body,
      now: now + 6 * 60 * 1000,
      timestamp: headers[TIMESTAMP_HEADER],
      signature: headers[SIGNATURE_HEADER],
    });
    expect(result).toEqual({ ok: false, reason: "stale" });
  });

  test("rejects missing headers", async () => {
    const result = await verify({
      secret,
      body,
      now,
      timestamp: null,
      signature: null,
    });
    expect(result).toEqual({ ok: false, reason: "missing" });
  });
});
