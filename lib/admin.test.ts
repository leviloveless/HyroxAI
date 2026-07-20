import { describe, it, expect } from "vitest";
import { parseAdminEmails, emailIsAdmin } from "./admin";

describe("parseAdminEmails", () => {
  it("splits on comma/space, lowercases, trims, drops blanks", () => {
    expect(parseAdminEmails("A@x.com, b@y.com  c@z.com")).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
});

describe("emailIsAdmin", () => {
  const allow = "Levi@Duravel.app, coach@duravel.app";
  it("matches case-insensitively", () => {
    expect(emailIsAdmin(allow, "levi@duravel.app")).toBe(true);
    expect(emailIsAdmin(allow, "LEVI@duravel.app")).toBe(true);
    expect(emailIsAdmin(allow, "coach@duravel.app")).toBe(true);
  });
  it("rejects non-admins and empty", () => {
    expect(emailIsAdmin(allow, "someone@else.com")).toBe(false);
    expect(emailIsAdmin(allow, null)).toBe(false);
    expect(emailIsAdmin("", "levi@duravel.app")).toBe(false);
  });
});
