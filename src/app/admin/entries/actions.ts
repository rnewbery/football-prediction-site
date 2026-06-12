"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function deleteEntry(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const entryId = Number(formData.get("entry_id"));
  const competitionId = Number(
    formData.get("competition_id")
  );

  if (!entryId) {
    redirect(
      "/admin/entries?error=The entry could not be deleted."
    );
  }

  const { error } = await supabase
    .from("entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    redirect(
      `/admin/entries?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (competitionId) {
    await supabase.rpc("recalculate_competition_scores", {
      p_competition_id: competitionId,
    });
  }

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/entries");

  redirect("/admin/entries?success=Entry deleted.");
}