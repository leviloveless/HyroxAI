/**
 * Generation-cost analytics (#14) — PURE, unit-testable.
 *
 * Every real generation run stamps its token usage + estimated cost on a
 * `generation_events` row (migrations 0003/0004/0012: kind, input_tokens,
 * output_tokens, cost_usd). This module rolls those rows up into average cost
 * per generation — overall, by kind (create vs recalculate), and correlated with
 * program attributes (type, length, #races, input-data volume) — so the true
 * average program-generation and recalculation cost is measured, not guessed.
 */

export interface GenEvent {
  kind: string; // "create" | "recalculate" | "adapt"
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  programType: string | null;
  durationWeeks: number | null;
  raceCount: number | null;
  /** JSON size of the user's input snapshot — a proxy for "data inputted". */
  inputBytes: number | null;
}

export interface CostStats {
  /** Events that carry usage (cost stamped). */
  count: number;
  totalCostUsd: number;
  avgCostUsd: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

export interface Bucket {
  key: string;
  stats: CostStats;
}

export interface CostRollup {
  overall: CostStats;
  byKind: Bucket[];
  byProgramType: Bucket[];
  byDurationBucket: Bucket[];
  byRaceCount: Bucket[];
  byInputSizeBucket: Bucket[];
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Cost/token stats over the events that have usage stamped. */
export function statsFor(rows: GenEvent[]): CostStats {
  const withUsage = rows.filter((r) => r.costUsd != null);
  const n = withUsage.length;
  if (n === 0) {
    return { count: 0, totalCostUsd: 0, avgCostUsd: 0, avgInputTokens: 0, avgOutputTokens: 0 };
  }
  const sum = (f: (r: GenEvent) => number | null): number =>
    withUsage.reduce((a, r) => a + (f(r) ?? 0), 0);
  const totalCost = sum((r) => r.costUsd);
  return {
    count: n,
    totalCostUsd: round(totalCost, 4),
    avgCostUsd: round(totalCost / n, 4),
    avgInputTokens: Math.round(sum((r) => r.inputTokens) / n),
    avgOutputTokens: Math.round(sum((r) => r.outputTokens) / n),
  };
}

function groupStats(rows: GenEvent[], keyOf: (r: GenEvent) => string): Bucket[] {
  const groups = new Map<string, GenEvent[]>();
  for (const r of rows) {
    const k = keyOf(r);
    const list = groups.get(k) ?? [];
    list.push(r);
    groups.set(k, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, stats: statsFor(list) }))
    .filter((b) => b.stats.count > 0)
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** Duration → a coarse bucket label. */
export function durationBucket(weeks: number | null): string {
  if (weeks == null) return "unknown";
  if (weeks <= 8) return "4–8 wk";
  if (weeks <= 12) return "9–12 wk";
  if (weeks <= 16) return "13–16 wk";
  return "17–24 wk";
}

/** Race count → a bucket label (0 / 1 / 2 / 3+). */
export function raceBucket(count: number | null): string {
  if (count == null) return "unknown";
  if (count <= 0) return "0 races";
  if (count >= 3) return "3+ races";
  return `${count} race${count === 1 ? "" : "s"}`;
}

/** Input-data volume → a bucket label. */
export function inputSizeBucket(bytes: number | null): string {
  if (bytes == null) return "unknown";
  if (bytes < 1000) return "<1 KB";
  if (bytes < 2000) return "1–2 KB";
  if (bytes < 4000) return "2–4 KB";
  return "4 KB+";
}

/** Full rollup used by the admin metrics page. */
export function rollupGenerationCost(rows: GenEvent[]): CostRollup {
  return {
    overall: statsFor(rows),
    byKind: groupStats(rows, (r) => r.kind || "unknown"),
    byProgramType: groupStats(rows, (r) => r.programType ?? "unknown"),
    byDurationBucket: groupStats(rows, (r) => durationBucket(r.durationWeeks)),
    byRaceCount: groupStats(rows, (r) => raceBucket(r.raceCount)),
    byInputSizeBucket: groupStats(rows, (r) => inputSizeBucket(r.inputBytes)),
  };
}
