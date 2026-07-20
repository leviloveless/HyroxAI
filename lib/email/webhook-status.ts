import type { EmailStatus } from "./types";

/**
 * Pure status-advancement logic for the Resend delivery webhook (07 go-live).
 *
 * A single email_sends row is advanced through its lifecycle by out-of-order webhook
 * events (Resend does NOT guarantee ordering). The rule is ADVANCE-FORWARD-ONLY: a row
 * may only move to a higher-ranked status, so a late `email.delivered` can never clobber
 * an already-recorded `clicked`, and a terminal `bounced`/`complained`/`failed` sticks.
 */

/**
 * Monotonic rank. Engagement escalates queued → sent → delivered → opened → clicked.
 * The negative-terminal statuses (bounced/complained/failed) sit at the top so they win
 * and are never regressed. `queued`/`skipped` are the floor (any real event advances).
 */
const RANK: Record<EmailStatus, number> = {
  skipped: 0,
  queued: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 5,
  complained: 5,
  failed: 5,
};

/**
 * Map a Resend webhook event `type` to the EmailStatus it implies, or null when the
 * event carries no status transition (unknown type, delivery_delayed, etc.).
 */
export function eventToStatus(eventType: string): EmailStatus | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    // email.delivery_delayed / email.scheduled / anything else → no transition.
    default:
      return null;
  }
}

/**
 * Given the row's current status and an incoming event type, return the status to write,
 * or null to leave the row unchanged (unknown event, a duplicate, or a would-be
 * regression). Callers only UPDATE when this returns non-null.
 */
export function nextStatus(current: EmailStatus, eventType: string): EmailStatus | null {
  const incoming = eventToStatus(eventType);
  if (!incoming) return null;
  if (RANK[incoming] > RANK[current]) return incoming;
  return null;
}
