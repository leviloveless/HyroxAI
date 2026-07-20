import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import HyroxLookup from "@/components/onboarding/hyrox-lookup";

/**
 * HYROX result lookup tool (#17). Athletes find their race result by name to get
 * their finish time + splits as a benchmark. HYROX only (the API doesn't cover
 * DEKA/Ironman — enter those manually).
 */
export const dynamic = "force-dynamic";

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
        <h1 className="text-2xl font-semibold">Find your HYROX result</h1>
        <p className="text-sm text-zinc-600">
          Search the official HYROX results by name to pull your finish time and station splits — use
          them as your benchmark. (HYROX only; enter DEKA or Ironman times manually.)
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <HyroxLookup defaultFirst={profile?.first_name ?? ""} />
      </section>
    </main>
  );
}
