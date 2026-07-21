import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/leads/science — capture an email for the volume-vs-intensity
 * methodology PDF (public, unauthenticated). Writes to `science_leads` via the
 * service-role client (RLS-protected table, no anon policy).
 *
 * The download is never blocked on a storage hiccup: a failed insert still
 * returns ok so the client reveals the PDF. We just record `stored: false`.
 */

const LeadSchema = z.object({
  email: z.string().email().max(200),
  source: z.string().max(60).optional(),
  sport: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const { email, source, sport } = parsed.data;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("science_leads").insert({
      email: email.toLowerCase().trim(),
      source: source ?? "science_pdf",
      sport: sport ?? null,
    });
    if (error) {
      console.error("[leads/science] insert failed:", error.message);
      return NextResponse.json({ ok: true, stored: false });
    }
  } catch (err) {
    console.error("[leads/science] error:", (err as Error).message);
    return NextResponse.json({ ok: true, stored: false });
  }

  return NextResponse.json({ ok: true, stored: true });
}
