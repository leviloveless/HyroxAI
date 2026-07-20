import { describe, it, expect } from "vitest";
import { nextStatus, eventToStatus } from "./webhook-status";

describe("eventToStatus", () => {
  it("maps known Resend event types", () => {
    expect(eventToStatus("email.sent")).toBe("sent");
    expect(eventToStatus("email.delivered")).toBe("delivered");
    expect(eventToStatus("email.opened")).toBe("opened");
    expect(eventToStatus("email.clicked")).toBe("clicked");
    expect(eventToStatus("email.bounced")).toBe("bounced");
    expect(eventToStatus("email.complained")).toBe("complained");
    expect(eventToStatus("email.failed")).toBe("failed");
  });

  it("returns null for events with no status transition", () => {
    expect(eventToStatus("email.delivery_delayed")).toBeNull();
    expect(eventToStatus("contact.created")).toBeNull();
    expect(eventToStatus("")).toBeNull();
  });
});

describe("nextStatus — advance forward only", () => {
  it("advances up the engagement ladder", () => {
    expect(nextStatus("queued", "email.sent")).toBe("sent");
    expect(nextStatus("sent", "email.delivered")).toBe("delivered");
    expect(nextStatus("delivered", "email.opened")).toBe("opened");
    expect(nextStatus("opened", "email.clicked")).toBe("clicked");
  });

  it("does NOT regress: a late 'delivered' never overwrites 'clicked'", () => {
    expect(nextStatus("clicked", "email.delivered")).toBeNull();
    expect(nextStatus("opened", "email.delivered")).toBeNull();
    expect(nextStatus("clicked", "email.opened")).toBeNull();
  });

  it("ignores duplicate events at the same rank", () => {
    expect(nextStatus("delivered", "email.delivered")).toBeNull();
    expect(nextStatus("clicked", "email.clicked")).toBeNull();
  });

  it("terminal statuses stick and win", () => {
    expect(nextStatus("bounced", "email.delivered")).toBeNull();
    expect(nextStatus("bounced", "email.opened")).toBeNull();
    expect(nextStatus("complained", "email.clicked")).toBeNull();
    // but a real complaint/bounce can still land on an engaged row
    expect(nextStatus("clicked", "email.bounced")).toBe("bounced");
    expect(nextStatus("delivered", "email.complained")).toBe("complained");
  });

  it("advances from the queued/skipped floor", () => {
    expect(nextStatus("skipped", "email.delivered")).toBe("delivered");
    expect(nextStatus("queued", "email.bounced")).toBe("bounced");
  });

  it("returns null for unknown/no-op events regardless of state", () => {
    expect(nextStatus("sent", "email.delivery_delayed")).toBeNull();
    expect(nextStatus("queued", "totally.unknown")).toBeNull();
  });
});
