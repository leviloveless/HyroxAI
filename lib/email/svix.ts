import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Svix/Resend webhook signature verification WITHOUT the `svix` dependency (07 go-live).
 *
 * Resend signs webhooks with the Svix scheme:
 *   - the secret is `whsec_<base64>`; the HMAC key is base64decode(<base64>);
 *   - the signed content is `${svix-id}.${svix-timestamp}.${rawBody}`;
 *   - the expected signature is base64(HMAC_SHA256(key, signedContent));
 *   - the `svix-signature` header is a space-separated list of `v1,<sig>` entries — a
 *     payload is authentic if ANY listed v1 signature matches (compared timing-safely).
 *
 * We also reject clock skew of more than ±5 minutes (`svix-timestamp` is unix SECONDS),
 * which blocks replay of an old, captured request.
 *
 * PURE: the secret and current time are parameters, so it unit-tests without env or a
 * live clock.
 */

export interface SvixHeaders {
  /** svix-id */
  id: string;
  /** svix-timestamp (unix seconds, as a string) */
  timestamp: string;
  /** svix-signature — space-separated `v1,<base64sig>` entries */
  signature: string;
}

export interface VerifySvixInput {
  /** The RAW request body (exact bytes Resend signed). */
  payload: string;
  headers: SvixHeaders;
  /** `whsec_<base64>` (or a bare base64 secret). */
  secret: string;
  /** Override the clock for tests. Defaults to Date.now(). */
  nowMs?: number;
  /** Max allowed |now - timestamp|. Defaults to 5 minutes. */
  toleranceMs?: number;
}

const FIVE_MIN_MS = 5 * 60 * 1000;

export function verifySvix(input: VerifySvixInput): boolean {
  const { payload, headers, secret } = input;
  if (!headers?.id || !headers?.timestamp || !headers?.signature || !secret) {
    return false;
  }

  // Timestamp tolerance (replay protection). svix-timestamp is unix SECONDS.
  const tsSec = Number(headers.timestamp);
  if (!Number.isFinite(tsSec)) return false;
  const nowMs = input.nowMs ?? Date.now();
  const tolerance = input.toleranceMs ?? FIVE_MIN_MS;
  if (Math.abs(nowMs - tsSec * 1000) > tolerance) return false;

  // Derive the HMAC key from the `whsec_`-prefixed base64 secret.
  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(rawSecret, "base64");
  if (key.length === 0) return false;

  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Accept if ANY `v1,<sig>` entry matches (timing-safe).
  for (const entry of headers.signature.split(" ")) {
    const comma = entry.indexOf(",");
    if (comma < 0) continue;
    const version = entry.slice(0, comma);
    if (version !== "v1") continue;
    const sig = entry.slice(comma + 1);
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}
