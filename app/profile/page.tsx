import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="text-sm text-zinc-500">
        This basic form covers Milestone 2 (auth + persistence). The full
        4-step intake with benchmarks and race scheduling lands in
        Milestone 4 (onboarding).
      </p>
      <ProfileForm profile={profile} />
    </main>
  );
}
