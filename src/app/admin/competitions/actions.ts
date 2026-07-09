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
      accepting_entries: false,
      show_on_leaderboard: false,
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
      "Competition archived."
    )}`
  );
}

export async function createCompetition(formData: FormData) {
  const supabase = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const accessCode = String(formData.get("access_code") ?? "").trim();
  const entryCost = Number(formData.get("entry_cost") ?? 0);
  const closingDate = String(formData.get("closing_date") ?? "").trim();

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

  const { error: closeOtherEntryCompetitionsError } = await supabase
    .from("competitions")
    .update({
      accepting_entries: false,
    })
    .eq("accepting_entries", true);

  if (closeOtherEntryCompetitionsError) {
    console.error(
      "Unable to close other entry competitions:",
      closeOtherEntryCompetitionsError.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Existing open competitions could not be closed."
      )}`
    );
  }

  const { error: insertError } = await supabase
    .from("competitions")
    .insert({
      name,
      access_code: accessCode,
      entry_cost: entryCost,
      closing_date: closingDate,
      exact_score_points: 5,
      correct_result_points: 2,
      incorrect_result_points: 0,
      first_prize: firstPrize || null,
      second_prize: secondPrize || null,
      third_prize: thirdPrize || null,
      prize_notes: prizeNotes || null,
      is_active: true,
      accepting_entries: true,
      show_on_leaderboard: false,
    });

  if (insertError) {
    console.error(
      "Unable to create competition:",
      insertError.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition could not be created."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "New competition created and opened for entries."
    )}`
  );
}

export async function setCompetitionAcceptingEntries(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(competitionId)) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition could not be opened for entries."
      )}`
    );
  }

  const { error: closeOthersError } = await supabase
    .from("competitions")
    .update({
      accepting_entries: false,
    })
    .neq("id", competitionId);

  if (closeOthersError) {
    console.error(
      "Unable to close other entry competitions:",
      closeOthersError.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Other competitions could not be closed for entries."
      )}`
    );
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      is_active: true,
      accepting_entries: true,
    })
    .eq("id", competitionId);

  if (error) {
    console.error(
      "Unable to open competition for entries:",
      error.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition could not be opened for entries."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "Competition opened for entries."
    )}`
  );
}

export async function closeCompetitionEntries(formData: FormData) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(competitionId)) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition entries could not be closed."
      )}`
    );
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      accepting_entries: false,
    })
    .eq("id", competitionId);

  if (error) {
    console.error(
      "Unable to close competition entries:",
      error.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Competition entries could not be closed."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "Competition entries closed."
    )}`
  );
}

export async function setCompetitionLeaderboard(formData: FormData) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(competitionId)) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Current leaderboard could not be changed."
      )}`
    );
  }

  const { error: hideOthersError } = await supabase
    .from("competitions")
    .update({
      show_on_leaderboard: false,
    })
    .neq("id", competitionId);

  if (hideOthersError) {
    console.error(
      "Unable to hide other leaderboards:",
      hideOthersError.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Other leaderboards could not be hidden."
      )}`
    );
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      is_active: true,
      show_on_leaderboard: true,
    })
    .eq("id", competitionId);

  if (error) {
    console.error(
      "Unable to set current leaderboard:",
      error.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Current leaderboard could not be changed."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "Current leaderboard changed."
    )}`
  );
}

export async function hideCompetitionLeaderboard(formData: FormData) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(competitionId)) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Leaderboard could not be hidden."
      )}`
    );
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      show_on_leaderboard: false,
    })
    .eq("id", competitionId);

  if (error) {
    console.error("Unable to hide leaderboard:", error.message);

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Leaderboard could not be hidden."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "Leaderboard hidden."
    )}`
  );
}

export async function deleteArchivedCompetition(formData: FormData) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(competitionId)) {
    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        "Archived competition could not be deleted."
      )}`
    );
  }

  const { error } = await supabase.rpc(
    "delete_archived_competition",
    {
      p_competition_id: competitionId,
    }
  );

  if (error) {
    console.error(
      "Unable to delete archived competition:",
      error.message
    );

    redirect(
      `/admin/competitions?error=${encodeURIComponent(
        error.message || "Archived competition could not be deleted."
      )}`
    );
  }

  revalidateCompetitionPages();

  redirect(
    `/admin/competitions?success=${encodeURIComponent(
      "Archived competition deleted."
    )}`
  );
}