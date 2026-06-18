"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return supabase;
}

export async function deleteEntry(formData: FormData) {
  const supabase = await getAuthenticatedClient();

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
  revalidatePath("/admin/leaderboard");

  redirect("/admin/entries?success=Entry deleted.");
}

export async function updateEntryPredictions(formData: FormData) {
  const supabase = await getAuthenticatedClient();

  const entryId = Number(formData.get("entry_id"));
  const competitionId = Number(
    formData.get("competition_id")
  );

  if (!entryId || !competitionId) {
    redirect(
      "/admin/entries?error=The entry could not be updated."
    );
  }

  const { data: predictions, error: predictionsError } =
    await supabase
      .from("predictions")
      .select("id")
      .eq("entry_id", entryId);

  if (predictionsError) {
    redirect(
      `/admin/entries/${entryId}/edit?error=${encodeURIComponent(
        predictionsError.message
      )}`
    );
  }

  for (const prediction of predictions ?? []) {
    const homeScore = Number(
      formData.get(`prediction_${prediction.id}_home`)
    );

    const awayScore = Number(
      formData.get(`prediction_${prediction.id}_away`)
    );

    if (
      Number.isNaN(homeScore) ||
      Number.isNaN(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      redirect(
        `/admin/entries/${entryId}/edit?error=${encodeURIComponent(
          "Please enter valid scores for every prediction."
        )}`
      );
    }

    const { error: updateError } = await supabase
      .from("predictions")
      .update({
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      })
      .eq("id", prediction.id)
      .eq("entry_id", entryId);

    if (updateError) {
      redirect(
        `/admin/entries/${entryId}/edit?error=${encodeURIComponent(
          updateError.message
        )}`
      );
    }
  }

  await supabase.rpc("recalculate_competition_scores", {
    p_competition_id: competitionId,
  });

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/entries");
  revalidatePath("/admin/leaderboard");
  revalidatePath(`/admin/entries/${entryId}/edit`);

  redirect(
    "/admin/entries?success=Entry predictions updated."
  );
}