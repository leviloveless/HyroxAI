import { createClient } from "@/lib/supabase/server";

/** Row shape from the `profiles` table (see supabase/migrations/0001_init.sql). */
export type ProfileRow = {
  id: string;
  first_name: string;
  age: number;
  body_weight: number;
  weight_unit: "lbs" | "kg";
  running_exp: "beginner" | "intermediate" | "advanced";
  hybrid_exp: "beginner" | "intermediate" | "advanced";
  lifting_exp: "beginner" | "intermediate" | "advanced";
  training_class: "non_highly_trained" | "highly_trained";
  training_days: string[];
  benchmarks: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}
