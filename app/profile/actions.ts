"use server";

import { createClient } from "@/lib/supabase/server";
import { ProfileSchema } from "@/lib/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ProfileState = { error: string | null };

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const trainingDays = DAY_KEYS.filter((d) => formData.get(`day_${d}`) === "on");

  const parsed = ProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    age: Number(formData.get("age")),
    bodyWeight: Number(formData.get("bodyWeight")),
    weightUnit: formData.get("weightUnit"),
    runningExp: formData.get("runningExp"),
    hybridExp: formData.get("hybridExp"),
    liftingExp: formData.get("liftingExp"),
    trainingClass: formData.get("trainingClass"),
    trainingDays,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: parsed.data.firstName,
    age: parsed.data.age,
    body_weight: parsed.data.bodyWeight,
    weight_unit: parsed.data.weightUnit,
    running_exp: parsed.data.runningExp,
    hybrid_exp: parsed.data.hybridExp,
    lifting_exp: parsed.data.liftingExp,
    training_class: parsed.data.trainingClass,
    training_days: parsed.data.trainingDays,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
