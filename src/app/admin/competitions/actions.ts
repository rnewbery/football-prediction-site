"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/admin/login");
  }

  return supabase;
}

function revalidateCompetitionPages() {
  revalidatePath("/");
  revalidatePath("/predict");
  revalidatePath("/leaderboard");
  revalidatePath("/previous-competitions");
  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/entries");
  revalidatePath("/admin/leaderboard");
}

export async function archiveCurrentCompetition(formData: FormData) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(competitionId)) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition could not be archived."
      )}`
    );
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      is_active: false,
    })
    .eq("id", competitionId);

  if (error) {
    console.error("Unable to archive competition:", error.message);

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition could not be archived."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "Competition archived. You can now create a new active competition."
    )}`
  );
}

export async function createCompetition(formData: FormData) {
  const supabase = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const accessCode = String(formData.get("access_code") ?? "").trim();
  const entryCost = Number(formData.get("entry_cost") ?? 0);
  const closingDate = String(formData.get("closing_date") ?? "").trim();

  const exactScorePoints = Number(
    formData.get("exact_score_points") ?? 3
  );

  const correctResultPoints = Number(
    formData.get("correct_result_points") ?? 1
  );

  const incorrectResultPoints = Number(
    formData.get("incorrect_result_points") ?? 0
  );

  const firstPrize = String(formData.get("first_prize") ?? "").trim();
  const secondPrize = String(formData.get("second_prize") ?? "").trim();
  const thirdPrize = String(formData.get("third_prize") ?? "").trim();
  const prizeNotes = String(formData.get("prize_notes") ?? "").trim();

  if (!name || !accessCode || !closingDate) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition name, access code and closing date are required."
      )}`
    );
  }

  if (!Number.isFinite(entryCost) || entryCost < 0) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Entry cost must be a valid number."
      )}`
    );
  }

  const { data: newCompetition, error: insertError } = await supabase
    .from("competitions")
    .insert({
      name,
      access_code: accessCode,
      entry_cost: entryCost,
      closing_date: closingDate,
      exact_score_points: exactScorePoints,
      correct_result_points: correctResultPoints,
      incorrect_result_points: incorrectResultPoints,
      first_prize: firstPrize || null,
      second_prize: secondPrize || null,
      third_prize: thirdPrize || null,
      prize_notes: prizeNotes || null,
      is_active: false,
    })
    .select("id")
    .single();

  if (insertError || !newCompetition) {
    console.error(
      "Unable to create competition:",
      insertError?.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition could not be created. The current competition has not been changed."
      )}`
    );
  }

  const { error: deactivateError } = await supabase
    .from("competitions")
    .update({
      is_active: false,
    })
    .eq("is_active", true);

  if (deactivateError) {
    console.error(
      "Unable to deactivate existing competitions:",
      deactivateError.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "New competition was created, but the old active competition could not be archived."
      )}`
    );
  }

  const { error: activateError } = await supabase
    .from("competitions")
    .update({
      is_active: true,
    })
    .eq("id", newCompetition.id);

  if (activateError) {
    console.error(
      "Unable to activate new competition:",
      activateError.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "New competition was created, but it could not be activated."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "New competition created and activated."
    )}`
  );
}