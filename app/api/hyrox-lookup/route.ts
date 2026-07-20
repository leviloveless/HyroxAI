import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchAthletes, getAthleteResult, hyresultConfigured } from "@/lib/hyrox-results-api";

/**
 * POST /api/hyrox-lookup  { first, last } (#17)
 *
 * Searches the HYROX Result API by name and resolves the top hits to full
 * results (finish time + splits) for the athlete to confirm which is theirs.
 * Server-side so the API key never reaches the browser. Bounded to a handful of
 * hits so a single lookup can't blow the 30/min Starter rate limit.
 */
export const maxDuration = 30;

const MAX_HITS = 8;
const BodySchema = z.object({
  first: z.string().max(80).optional().default(""),
  last: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!hyresultConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a surname to search." }, { status: 400 });

  try {
    const hits = (await searchAthletes(parsed.data.first, parsed.data.last)).slice(0, MAX_HITS);
    // Resolve each hit to a full result; drop any that fail individually.
    const results = await Promise.all(
      hits.map((h) => getAthleteResult(h.id).catch(() => null)),
    );
    const candidates = results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => r.totalTimeMs != null);
    return NextResponse.json({ candidates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "lookup_failed";
    if (msg === "hyresult_rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }
}
