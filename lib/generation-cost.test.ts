import { describe, it, expect } from "vitest";
import { statsFor, rollupGenerationCost, durationBucket, raceBucket, inputSizeBucket, type GenEvent } from "./generation-cost";

const ev = (o: Partial<GenEvent>): GenEvent => ({
  kind: o.kind ?? "create",
  inputTokens: o.inputTokens ?? 1000,
  outputTokens: o.outputTokens ?? 500,
  costUsd: o.costUsd === undefined ? 0.01 : o.costUsd,
  programType: o.programType ?? "goal_event",
  durationWeeks: o.durationWeeks ?? 12,
  raceCount: o.raceCount ?? 1,
  inputBytes: o.inputBytes ?? 1500,
});

describe("statsFor", () => {
  it("averages only events with usage", () => {
    const s = statsFor([ev({ costUsd: 0.02, inputTokens: 2000, outputTokens: 1000 }), ev({ costUsd: 0.04, inputTokens: 4000, outputTokens: 2000 }), ev({ costUsd: null })]);
    expect(s.count).toBe(2);
    expect(s.avgCostUsd).toBe(0.03);
    expect(s.totalCostUsd).toBe(0.06);
    expect(s.avgInputTokens).toBe(3000);
    expect(s.avgOutputTokens).toBe(1500);
  });
  it("is zeroed when nothing has usage", () => {
    expect(statsFor([ev({ costUsd: null })])).toEqual({ count: 0, totalCostUsd: 0, avgCostUsd: 0, avgInputTokens: 0, avgOutputTokens: 0 });
  });
});

describe("buckets", () => {
  it("duration", () => {
    expect(durationBucket(6)).toBe("4–8 wk");
    expect(durationBucket(12)).toBe("9–12 wk");
    expect(durationBucket(20)).toBe("17–24 wk");
    expect(durationBucket(null)).toBe("unknown");
  });
  it("race", () => {
    expect(raceBucket(0)).toBe("0 races");
    expect(raceBucket(1)).toBe("1 race");
    expect(raceBucket(2)).toBe("2 races");
    expect(raceBucket(5)).toBe("3+ races");
  });
  it("input size", () => {
    expect(inputSizeBucket(500)).toBe("<1 KB");
    expect(inputSizeBucket(3000)).toBe("2–4 KB");
    expect(inputSizeBucket(9000)).toBe("4 KB+");
  });
});

describe("rollupGenerationCost", () => {
  it("splits create vs recalculate and correlates attributes", () => {
    const r = rollupGenerationCost([
      ev({ kind: "create", costUsd: 0.02, programType: "goal_event", durationWeeks: 12, raceCount: 1 }),
      ev({ kind: "recalculate", costUsd: 0.03, programType: "goal_event", durationWeeks: 16, raceCount: 2 }),
      ev({ kind: "create", costUsd: 0.04, programType: "general_fitness", durationWeeks: 8, raceCount: 0 }),
    ]);
    expect(r.overall.count).toBe(3);
    expect(r.overall.avgCostUsd).toBe(0.03);
    const create = r.byKind.find((b) => b.key === "create")!;
    const recalc = r.byKind.find((b) => b.key === "recalculate")!;
    expect(create.stats.count).toBe(2);
    expect(create.stats.avgCostUsd).toBe(0.03);
    expect(recalc.stats.count).toBe(1);
    expect(r.byProgramType.map((b) => b.key)).toEqual(["general_fitness", "goal_event"]);
  });
});
