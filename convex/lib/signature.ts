export const SIGNATURE_HEADER = "x-lendloop-signature";
export const TIMESTAMP_HEADER = "x-lendloop-timestamp";
export const MAX_CLOCK_SKEW_SECONDS = 300;

const encoder = new TextEncoder();

async function computeHmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// The timestamp is part of the signed string so a captured request
// cannot be replayed once it falls outside the skew window.
export async function sign(secret: string, timestamp: string, body: string) {
  return `v1=${await computeHmacHex(secret, `${timestamp}.${body}`)}`;
}

export async function buildSignedHeaders(
  secret: string,
  body: string,
  now: number = Date.now(),
) {
  const timestamp = Math.floor(now / 1000).toString();
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: await sign(secret, timestamp, body),
  };
}

export type VerifyResult =
  { ok: true } | { ok: false; reason: "missing" | "stale" | "mismatch" };

export async function verify(args: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: number;
}): Promise<VerifyResult> {
  const { secret, timestamp, signature, body } = args;
  if (!timestamp || !signature) return { ok: false, reason: "missing" };

  const sentAt = Number(timestamp);
  const nowSeconds = Math.floor((args.now ?? Date.now()) / 1000);
  if (
    !/^\d+$/.test(timestamp) ||
    Math.abs(nowSeconds - sentAt) > MAX_CLOCK_SKEW_SECONDS
  ) {
    return { ok: false, reason: "stale" };
  }

  const expected = await sign(secret, timestamp, body);
  return timingSafeEqual(expected, signature)
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}
