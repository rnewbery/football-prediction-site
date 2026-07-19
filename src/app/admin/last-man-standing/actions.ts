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

function revalidateLmsPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/last-man-standing");
  revalidatePath("/last-man-standing");
  revalidatePath("/last-man-standing/predict");
  revalidatePath("/last-man-standing/leaderboard");
}

function getRequiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  return value;
}

function getRequiredNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key));

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

export async function createLastManStandingCompetition(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const linkedCompetitionId = getRequiredNumber(
    formData,
    "linked_competition_id"
  );

  const name = getRequiredString(formData, "name");

  if (!linkedCompetitionId || !name) {
    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing game could not be created. Choose a Premier League competition and enter a name."
      )}`
    );
  }

  const { data: linkedCompetition, error: linkedCompetitionError } =
    await supabase
      .from("competitions")
      .select("id, name, access_code, closing_date")
      .eq("id", linkedCompetitionId)
      .maybeSingle();

  if (linkedCompetitionError || !linkedCompetition) {
    console.error(
      "Unable to load linked Premier League competition:",
      linkedCompetitionError?.message ?? "No competition found."
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Linked Premier League competition could not be found."
      )}`
    );
  }

  const { data: existingLms, error: existingError } = await supabase
    .from("last_man_standing_competitions")
    .select("id")
    .eq("linked_competition_id", linkedCompetitionId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) {
    console.error(
      "Unable to check existing Last Man Standing game:",
      existingError.message
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Could not check whether this Premier League competition already has a Last Man Standing game."
      )}`
    );
  }

  if (existingLms) {
    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "This Premier League competition already has a Last Man Standing game linked to it."
      )}`
    );
  }

  const { data: newCompetition, error: createError } = await supabase
    .from("last_man_standing_competitions")
    .insert({
      name,
      linked_competition_id: linkedCompetitionId,
      access_code: linkedCompetition.access_code,
      closing_date: linkedCompetition.closing_date,
      is_active: true,

      // These are kept only because the columns exist.
      // Public LMS pages now follow the linked Premier League competition instead.
      accepting_entries: false,
      show_on_leaderboard: false,
    })
    .select("id")
    .single();

  if (createError || !newCompetition) {
    console.error(
      "Unable to create Last Man Standing game:",
      createError?.message ?? "No competition returned."
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing game could not be created."
      )}`
    );
  }

  const { error: rulesError } = await supabase
    .from("last_man_standing_week_rules")
    .insert([
      {
        lms_competition_id: newCompetition.id,
        week_name: "Week 1",
        required_picks: 3,
      },
      {
        lms_competition_id: newCompetition.id,
        week_name: "Week 2",
        required_picks: 2,
      },
      {
        lms_competition_id: newCompetition.id,
        week_name: "Week 3",
        required_picks: 2,
      },
      {
        lms_competition_id: newCompetition.id,
        week_name: "Week 4",
        required_picks: 2,
      },
    ]);

  if (rulesError) {
    console.error(
      "Unable to create Last Man Standing week rules:",
      rulesError.message
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing game was created, but week rules could not be added."
      )}`
    );
  }

  revalidateLmsPages();

  redirect(
    `/admin/last-man-standing?success=${encodeURIComponent(
      "Last Man Standing game linked to Premier League competition."
    )}`
  );
}

export async function archiveLastManStandingCompetition(
  formData: FormData
) {
  const supabase = await requireAdmin();

  const competitionId = getRequiredNumber(formData, "competition_id");

  if (!competitionId) {
    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing game could not be archived."
      )}`
    );
  }

  const { error } = await supabase
    .from("last_man_standing_competitions")
    .update({
      is_active: false,
      accepting_entries: false,
      show_on_leaderboard: false,
    })
    .eq("id", competitionId);

  if (error) {
    console.error(
      "Unable to archive Last Man Standing game:",
      error.message
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing game could not be archived."
      )}`
    );
  }

  revalidateLmsPages();

  redirect(
    `/admin/last-man-standing?success=${encodeURIComponent(
      "Last Man Standing game archived."
    )}`
  );
}

export async function deleteLastManStandingEntry(formData: FormData) {
  const supabase = await requireAdmin();

  const entryId = getRequiredNumber(formData, "entry_id");

  if (!entryId) {
    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing entry could not be deleted."
      )}`
    );
  }

  const { error: picksError } = await supabase
    .from("last_man_standing_picks")
    .delete()
    .eq("entry_id", entryId);

  if (picksError) {
    console.error(
      "Unable to delete Last Man Standing picks:",
      picksError.message
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing entry picks could not be deleted."
      )}`
    );
  }

  const { data: deletedEntry, error: entryError } = await supabase
    .from("last_man_standing_entries")
    .delete()
    .eq("id", entryId)
    .select("id")
    .maybeSingle();

  if (entryError || !deletedEntry) {
    console.error(
      "Unable to delete Last Man Standing entry:",
      entryError?.message ?? "No entry was deleted."
    );

    redirect(
      `/admin/last-man-standing?error=${encodeURIComponent(
        "Last Man Standing entry could not be deleted."
      )}`
    );
  }

  revalidateLmsPages();

  redirect(
    `/admin/last-man-standing?success=${encodeURIComponent(
      "Last Man Standing entry deleted."
    )}`
  );
}