import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import HyroxLookup from "@/components/onboarding/hyrox-lookup";

/**
 * Race-result lookup tool (#17). HYROX is live (hyroxresultapi.com); Ironman
 * (Athlinks) and DEKA (RACE RESULT) are placeholders until those data sources are
 * wired. Athletes get their finish time + splits to use as a benchmark.
 */
export const dynamic = "force-dynamic";

function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <section className="flex items-start justify-between gap-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{note}</p>
      </div>
      <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600">
        Coming soon
      </span>
    </section>
  );
}

export default async function HyroxLookupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm text-zinc-500 underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Find your race result</h1>
        <p className="text-sm text-zinc-600">
          Pull your finish time and splits from official results to use as your benchmark.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold">HYROX</h2>
        <p className="mb-3 text-xs text-zinc-500">Search the official HYROX results by name.</p>
        <HyroxLookup defaultFirst={profile?.first_name ?? ""} />
      </section>

      <ComingSoon
        title="Find your Ironman result"
        note="Coming soon — via Athlinks (API access pending). For now, enter your time manually."
      />
      <ComingSoon
        title="Find your DEKA result"
        note="Coming soon — DEKA results aren't centralized. For now, enter your DEKA time manually."
      />
    </main>
  );
}
