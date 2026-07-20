import { describe, it, expect } from "vitest";
import { formatMs, normalizeSearchHits, normalizeResult } from "./hyrox-results";

describe("formatMs", () => {
  it("formats h:mm:ss and m:ss, null-safe", () => {
    expect(formatMs(3878000)).toBe("1:04:38");
    expect(formatMs(70000)).toBe("1:10");
    expect(formatMs(0)).toBe("0:00");
    expect(formatMs(null)).toBe("");
    expect(formatMs(-5)).toBe("");
  });
});

describe("normalizeSearchHits", () => {
  it("reads hits from results/data/array and picks id + person_ref", () => {
    expect(normalizeSearchHits({ results: [{ id: "r1", person_ref: "p1", name: "Alex" }] }))
      .toEqual([{ id: "r1", personRef: "p1", name: "Alex" }]);
    expect(normalizeSearchHits([{ id: 42, person_ref: "p2" }]))
      .toEqual([{ id: "42", personRef: "p2", name: null }]);
    expect(normalizeSearchHits({ data: [{ race_id: "r3" }] }))
      .toEqual([{ id: "r3", personRef: null, name: null }]);
    expect(normalizeSearchHits({})).toEqual([]);
    expect(normalizeSearchHits(null)).toEqual([]);
  });
  it("skips objects without an id", () => {
    expect(normalizeSearchHits([{ person_ref: "p" }, { id: "ok" }])).toEqual([
      { id: "ok", personRef: null, name: null },
    ]);
  });
});

describe("normalizeResult", () => {
  it("reads total time + division + splits defensively", () => {
    const r = normalizeResult("r1", {
      name: "Alex Morgan",
      division: "Men's Open",
      event: "HYROX Dallas",
      total_time_ms: 3878000,
      splits: { skiErg_time_ms: 281000, sledPush_time_ms: 232000, wallBalls_time_ms: 302000 },
    });
    expect(r.finishTime).toBe("1:04:38");
    expect(r.division).toBe("Men's Open");
    expect(r.name).toBe("Alex Morgan");
    const ski = r.splits.find((s) => s.station === "SkiErg")!;
    expect(ski.time).toBe("4:41");
    expect(r.splits.map((s) => s.station)).toContain("Wall Balls");
  });
  it("handles alternate key names + missing data", () => {
    const r = normalizeResult("r2", { totalTimeMs: 70000, division_key: "pro" });
    expect(r.finishTime).toBe("1:10");
    expect(r.division).toBe("pro");
    expect(r.splits).toEqual([]);
  });
  it("empty on junk", () => {
    const r = normalizeResult("r3", null);
    expect(r.totalTimeMs).toBeNull();
    expect(r.finishTime).toBe("");
  });
});
