import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { signOut } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {profile ? `Welcome back, ${profile.first_name}` : "Your programs"}
        </h1>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-500 underline">
            Sign out
          </button>
        </form>
      </div>

      {!profile && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You haven&apos;t saved a profile yet.{" "}
          <Link href="/profile" className="underline">
            Set it up
          </Link>{" "}
          before generating a program.
        </p>
      )}

      <p className="text-zinc-600">
        Program list + &ldquo;New program&rdquo; — Milestone 6.
      </p>

      {profile && (
        <Link href="/profile" className="self-start text-sm underline">
          Edit profile
        </Link>
      )}
    </main>
  );
}
