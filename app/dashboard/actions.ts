"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Delete one of the signed-in user's programs (Tasks addition #4).
 * RLS scopes the delete to the caller's own rows; `races` cascade.
 */
export async function deleteProgram(formData: FormData): Promise<void> {
  const id = formData.get("programId");
  if (typeof id !== "string" || !id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("programs").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}
