/**
 * Generation orchestrator (architecture-plan.md §5, the critical path).
 *
 * Loads a program's stored engine skeleton + input snapshot, fans out one
 * Haiku call per mesocycle, assembles the results into the final program with
 * engine-computed summaries and guaranteed movement-pattern coverage, verifies
 * it, and persists program_data with status 'ready' (or 'failed' on error).
 *
 * The skeleton is produced at onboarding time (Milestone 4) and stored on the
 * program row, so this step never recomputes the periodization — it only fills
 * and assembles, which is also what per-week regeneration (phase 2) will reuse.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GenerationInputSchema,
  type AiChunk,
  type GenerationInput,
  type ProgramData,
} from "@/lib/schemas";
import type { PhaseName, ProgramSkeleton, WeekSkeleton } from "@/lib/engine/types";
import { buildSkeleton, toEngineInput } from "@/lib/engine";
import { generateChunk } from "@/lib/ai/generate-week";
import { assembleProgram, verifyProgram } from "./assemble";

/** Token + cost totals for one full generation (all mesocycle calls). */
export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface GenerateResult {
  ok: boolean;
  status: "ready" | "failed";
  issues: string[];
  usage?: GenerationUsage;
}

// Claude Haiku 4.5 list price (USD per token). Update if pricing changes; this
// is only used for at-a-glance cost logging, not billing.
const INPUT_COST_PER_TOKEN = 1 / 1_000_000; // $1 / 1M input tokens
const OUTPUT_COST_PER_TOKEN = 5 / 1_000_000; // $5 / 1M output tokens

/** Split the skeleton weeks into contiguous same-phase mesocycle chunks. */
export function chunkByMesocycle(skeleton: ProgramSkeleton): { phase: PhaseName; weeks: WeekSkeleton[] }[] {
  const chunks: { phase: PhaseName; weeks: WeekSkeleton[] }[] = [];
  for (const week of skeleton.weeks) {
    const last = chunks[chunks.length - 1];
    if (last && last.phase === week.phase) last.weeks.push(week);
    else chunks.push({ phase: week.phase, weeks: [week] });
  }
  return chunks;
}

/**
 * Run the full generation pipeline for one program. Assumes the caller has
 * already authorized the user for this program row.
 */
export async function generateProgram(
  supabase: SupabaseClient,
  programId: string,
): Promise<GenerateResult> {
  const { data: row, error } = await supabase
    .from("programs")
    .select("id, status, input_snapshot, start_date")
    .eq("id", programId)
    .single();

  if (error || !row) {
    return { ok: false, status: "failed", issues: [error?.message ?? "Program not found"] };
  }

  try {
    const parsedInput = GenerationInputSchema.safeParse(row.input_snapshot);
    if (!parsedInput.success) throw new Error("Stored input snapshot is invalid");
    const input: GenerationInput = parsedInput.data;

    // Rebuild the skeleton from the saved inputs so a recalculate always
    // reflects the current engine rules and any starting-volume overrides.
    const skeleton = buildSkeleton(toEngineInput(input, row.start_date ?? undefined));

    // Fan out one Haiku call per mesocycle (independent given the skeleton).
    const chunkPlan = chunkByMesocycle(skeleton);
    const results = await Promise.all(
      chunkPlan.map((c) => generateChunk(input, c.phase, c.weeks)),
    );
    const chunks: AiChunk[] = results.map((r) => r.chunk);

    // Sum token usage across all mesocycle calls and price it (Haiku list rate).
    const inputTokens = results.reduce((n, r) => n + r.usage.inputTokens, 0);
    const outputTokens = results.reduce((n, r) => n + r.usage.outputTokens, 0);
    const usage: GenerationUsage = {
      inputTokens,
      outputTokens,
      costUsd:
        Math.round(
          (inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN) * 1e6,
        ) / 1e6,
    };
    console.log(
      `[generate] program=${programId} calls=${results.length} in=${inputTokens} out=${outputTokens} cost=$${usage.costUsd.toFixed(4)}`,
    );

    // Assemble (engine summaries + pattern patching) and verify.
    const { program, issues } = assembleProgram(skeleton, chunks);
    const verdict = verifyProgram(program);
    if (!verdict.ok) {
      throw new Error(`Verification failed: ${verdict.issues.join("; ")}`);
    }

    await persist(supabase, programId, program, skeleton);
    return { ok: true, status: "ready", issues, usage };
  } catch (err) {
    await supabase.from("programs").update({ status: "failed" }).eq("id", programId);
    return { ok: false, status: "failed", issues: [(err as Error).message] };
  }
}

async function persist(
  supabase: SupabaseClient,
  programId: string,
  program: ProgramData,
  skeleton: ProgramSkeleton,
): Promise<void> {
  const { error } = await supabase
    .from("programs")
    .update({ program_data: program, skeleton, status: "ready" })
    .eq("id", programId);
  if (error) throw new Error(`Failed to persist program: ${error.message}`);
}
