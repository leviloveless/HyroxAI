import { createAdminClient } from "@/lib/supabase/admin";
import { rollupGenerationCost, type CostRollup, type GenEvent } from "@/lib/generation-cost";

/**
 * Admin generation-cost metrics (#14) — SERVICE ROLE. Joins `generation_events`
 * (usage) with each event's program attributes (type, length, races, input size)
 * and rolls it up via the pure `rollupGenerationCost`. Gate callers on getAdmin().
 */

type EventRow = {
  program_id: string | null;
  kind: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
};

type ProgramAttr = {
  id: string;
  program_type: string | null;
  duration_weeks: number | null;
  input_snapshot: unknown;
};

function raceCountOf(snapshot: unknown): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const races = (snapshot as { races?: unknown }).races;
  return Array.isArray(races) ? races.length : 0;
}

function inputBytesOf(snapshot: unknown): number | null {
  if (snapshot == null) return null;
  try {
    return JSON.stringify(snapshot).length;
  } catch {
    return null;
  }
}

export async function getGenerationCostRollup(): Promise<CostRollup> {
  const db = createAdminClient();
  const [{ data: events }, { data: programs }] = await Promise.all([
    db
      .from("generation_events")
      .select("program_id, kind, input_tokens, output_tokens, cost_usd")
      .not("cost_usd", "is", null),
    db.from("programs").select("id, program_type, duration_weeks, input_snapshot"),
  ]);

  const attrById = new Map<string, ProgramAttr>();
  for (const p of (programs as ProgramAttr[] | null) ?? []) attrById.set(p.id, p);

  const rows: GenEvent[] = ((events as EventRow[] | null) ?? []).map((e) => {
    const attr = e.program_id ? attrById.get(e.program_id) : undefined;
    return {
      kind: e.kind ?? "unknown",
      inputTokens: e.input_tokens,
      outputTokens: e.output_tokens,
      costUsd: e.cost_usd,
      programType: attr?.program_type ?? null,
      durationWeeks: attr?.duration_weeks ?? null,
      raceCount: attr ? raceCountOf(attr.input_snapshot) : null,
      inputBytes: attr ? inputBytesOf(attr.input_snapshot) : null,
    };
  });

  return rollupGenerationCost(rows);
}
