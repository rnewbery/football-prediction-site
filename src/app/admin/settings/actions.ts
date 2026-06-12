"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function updateCompetition(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const competitionId = Number(formData.get("competition_id"));
  const name = String(formData.get("name") ?? "").trim();
  const entryCost = Number(formData.get("entry_cost") ?? 0);
  const closingDateText = String(
    formData.get("closing_date") ?? ""
  ).trim();

  const exactScorePoints = Number(
    formData.get("exact_score_points") ?? 0
  );

  const correctResultPoints = Number(
    formData.get("correct_result_points") ?? 0
  );

  const incorrectResultPoints = Number(
    formData.get("incorrect_result_points") ?? 0
  );

  if (!competitionId || !name) {
    redirect(
      "/admin/settings?error=Enter a competition name."
    );
  }

  const closingDate = closingDateText
    ? new Date(closingDateText).toISOString()
    : null;

  const { error } = await supabase
    .from("competitions")
    .update({
      name,
      entry_cost: entryCost,
      closing_date: closingDate,
      exact_score_points: exactScorePoints,
      correct_result_points: correctResultPoints,
      incorrect_result_points: incorrectResultPoints,
    })
    .eq("id", competitionId);

  if (error) {
    redirect(
      `/admin/settings?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.rpc("recalculate_competition_scores", {
    p_competition_id: competitionId,
  });

  revalidatePath("/");
  revalidatePath("/predict");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");

  redirect(
    "/admin/settings?success=Competition settings updated."
  );
}