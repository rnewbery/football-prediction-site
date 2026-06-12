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

function optionalScore(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (text === "") {
    return null;
  }

  return Number(text);
}

export async function addFixture(formData: FormData) {
  const supabase = await getAuthenticatedClient();

  const competitionId = Number(
    formData.get("competition_id")
  );

  const fixtureLabel = String(
    formData.get("fixture_label") ?? ""
  ).trim();

  const gameNumber = String(
    formData.get("game_number") ?? ""
  ).trim();

  const homeTeam = String(
    formData.get("home_team") ?? ""
  ).trim();

  const awayTeam = String(
    formData.get("away_team") ?? ""
  ).trim();

  if (!competitionId || !homeTeam || !awayTeam) {
    redirect(
      "/admin/fixtures?error=Enter both teams before adding the fixture."
    );
  }

  const { error } = await supabase.from("fixtures").insert({
    competition_id: competitionId,
    fixture_label: fixtureLabel || null,
    group_name: gameNumber || null,
    home_team: homeTeam,
    away_team: awayTeam,
    match_status: "scheduled",
  });

  if (error) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/");
  revalidatePath("/predict");
  revalidatePath("/admin");
  revalidatePath("/admin/fixtures");

  redirect("/admin/fixtures?success=Fixture added.");
}

export async function updateFixture(formData: FormData) {
  const supabase = await getAuthenticatedClient();

  const fixtureId = Number(formData.get("fixture_id"));
  const competitionId = Number(
    formData.get("competition_id")
  );

  const fixtureLabel = String(
    formData.get("fixture_label") ?? ""
  ).trim();

  const gameNumber = String(
    formData.get("game_number") ?? ""
  ).trim();

  const homeTeam = String(
    formData.get("home_team") ?? ""
  ).trim();

  const awayTeam = String(
    formData.get("away_team") ?? ""
  ).trim();

  const homeScore = optionalScore(
    formData.get("home_score")
  );

  const awayScore = optionalScore(
    formData.get("away_score")
  );

  const matchStatus = String(
    formData.get("match_status") ?? "scheduled"
  );

  if (!fixtureId || !homeTeam || !awayTeam) {
    redirect(
      "/admin/fixtures?error=The fixture could not be updated."
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .update({
      fixture_label: fixtureLabel || null,
      group_name: gameNumber || null,
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore,
      away_score: awayScore,
      match_status: matchStatus,
    })
    .eq("id", fixtureId);

  if (error) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (competitionId) {
    await supabase.rpc("recalculate_competition_scores", {
      p_competition_id: competitionId,
    });
  }

  revalidatePath("/");
  revalidatePath("/predict");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/fixtures");

  redirect("/admin/fixtures?success=Fixture updated.");
}

export async function deleteFixture(formData: FormData) {
  const supabase = await getAuthenticatedClient();

  const fixtureId = Number(formData.get("fixture_id"));
  const competitionId = Number(
    formData.get("competition_id")
  );

  if (!fixtureId) {
    redirect(
      "/admin/fixtures?error=The fixture could not be deleted."
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .delete()
    .eq("id", fixtureId);

  if (error) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (competitionId) {
    await supabase.rpc("recalculate_competition_scores", {
      p_competition_id: competitionId,
    });
  }

  revalidatePath("/");
  revalidatePath("/predict");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/fixtures");

  redirect("/admin/fixtures?success=Fixture deleted.");
}