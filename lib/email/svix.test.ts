import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifySvix } from "./svix";

// A deterministic whsec_ secret (base64 of 24 bytes).
const KEY_BYTES = Buffer.from("0123456789abcdef01234567", "utf8");
const SECRET = `whsec_${KEY_BYTES.toString("base64")}`;

function sign(id: string, ts: string, body: string): string {
  const signed = `${id}.${ts}.${body}`;
  const sig = createHmac("sha256", KEY_BYTES).update(signed).digest("base64");
  return `v1,${sig}`;
}

const NOW = 1_700_000_000_000; // fixed clock (ms)
const TS = String(Math.floor(NOW / 1000)); // matching svix-timestamp (seconds)
const ID = "msg_2abc";
const BODY = JSON.stringify({ type: "email.delivered", data: { email_id: "re_123" } });

describe("verifySvix", () => {
  it("accepts a valid signature", () => {
    const headers = { id: ID, timestamp: TS, signature: sign(ID, TS, BODY) };
    expect(verifySvix({ payload: BODY, headers, secret: SECRET, nowMs: NOW })).toBe(true);
  });

  it("accepts when one of several space-separated v1 entries matches", () => {
    const good = sign(ID, TS, BODY).split(",")[1];
    const signature = `v1,AAAA v1,${good}`; // first is bogus, second is real
    const headers = { id: ID, timestamp: TS, signature };
    expect(verifySvix({ payload: BODY, headers, secret: SECRET, nowMs: NOW })).toBe(true);
  });

  it("rejects a tampered body", () => {
    const headers = { id: ID, timestamp: TS, signature: sign(ID, TS, BODY) };
    expect(
      verifySvix({ payload: BODY + "x", headers, secret: SECRET, nowMs: NOW }),
    ).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const headers = { id: ID, timestamp: TS, signature: sign(ID, TS, BODY) };
    const otherKey = Buffer.from("ffffffffffffffffffffffff", "utf8").toString("base64");
    expect(
      verifySvix({ payload: BODY, headers, secret: `whsec_${otherKey}`, nowMs: NOW }),
    ).toBe(false);
  });

  it("rejects a stale timestamp (> 5 min skew)", () => {
    const headers = { id: ID, timestamp: TS, signature: sign(ID, TS, BODY) };
    const sixMinLater = NOW + 6 * 60 * 1000;
    expect(verifySvix({ payload: BODY, headers, secret: SECRET, nowMs: sixMinLater })).toBe(
      false,
    );
  });

  it("rejects a future timestamp beyond tolerance", () => {
    const headers = { id: ID, timestamp: TS, signature: sign(ID, TS, BODY) };
    const sixMinBefore = NOW - 6 * 60 * 1000;
    expect(verifySvix({ payload: BODY, headers, secret: SECRET, nowMs: sixMinBefore })).toBe(
      false,
    );
  });

  it("rejects missing headers", () => {
    expect(
      verifySvix({
        payload: BODY,
        headers: { id: "", timestamp: TS, signature: sign(ID, TS, BODY) },
        secret: SECRET,
        nowMs: NOW,
      }),
    ).toBe(false);
  });
});
