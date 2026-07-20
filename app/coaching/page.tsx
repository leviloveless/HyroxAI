import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import WaitlistForm from "@/components/coaching/waitlist-form";

/**
 * Public 1-on-1 coaching page (#16) — $350/mo premium coaching, application-only
 * (Levi approves manually; no instant checkout). Prefills the form for signed-in
 * users.
 */
export const metadata = {
  title: "1-on-1 Coaching · Duravel",
  description: "Premium 1-on-1 hybrid-athlete coaching with Duravel.",
};

const PERKS = [
  "A program built and hand-tuned for you, adjusted every week",
  "Direct access to your coach for questions, form checks, and race strategy",
  "Weekly review of your training, recovery, and readiness data",
  "Race-day pacing and taper planning dialed to your goal",
];

export default async function CoachingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentProfile() : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <span className="self-start rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
          Premium · 1-on-1
        </span>
        <h1 className="text-3xl font-semibold">Coaching, one on one</h1>
        <p className="text-lg text-zinc-600">
          The full Duravel engine, plus a real coach in your corner. Limited spots —{" "}
          <strong>$350/mo</strong>, by application.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
            <span aria-hidden className="mt-0.5 text-emerald-600">
              ✓
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Apply for a spot</h2>
        <WaitlistForm
          defaultName={profile?.first_name ?? ""}
          defaultEmail={user?.email ?? ""}
        />
      </section>

      <p className="text-sm text-zinc-500">
        Not ready for 1-on-1?{" "}
        <Link href="/pricing" className="underline">
          The self-serve plan
        </Link>{" "}
        gives you the same adaptive engine at $19.99/mo.
      </p>
    </main>
  );
}
