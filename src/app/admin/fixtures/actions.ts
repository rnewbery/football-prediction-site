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

function parseKickoffDateTime(value: string) {
  const trimmedValue = value.trim();

  const match = trimmedValue.match(
    /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText, hourText, minuteText] =
    match;

  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  const monthNumber = monthMap[monthText.toLowerCase()];

  if (!monthNumber) {
    return null;
  }

  const day = dayText.padStart(2, "0");
  const hour = hourText.padStart(2, "0");
  const minute = minuteText.padStart(2, "0");
  const monthDisplay =
    monthText.slice(0, 1).toUpperCase() +
    monthText.slice(1, 3).toLowerCase();

  return {
    displayValue: `${Number(dayText)} ${monthDisplay} ${yearText} ${hour}:${minute}`,
    sortKey: `${yearText}-${monthNumber}-${day} ${hour}:${minute}`,
  };
}

function readNullableScore(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (text === "") {
    return null;
  }

  const score = Number(text);

  if (!Number.isFinite(score) || score < 0) {
    return null;
  }

  return score;
}

function readNullableApiFixtureId(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (text === "") {
    return null;
  }

  const apiFixtureId = Number(text);

  if (!Number.isFinite(apiFixtureId) || apiFixtureId <= 0) {
    return null;
  }

  return apiFixtureId;
}

function revalidateFixturePages() {
  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/entries");
  revalidatePath("/admin/leaderboard");
  revalidatePath("/admin/score-sync");
  revalidatePath("/admin/fixture-search");
  revalidatePath("/predict");
  revalidatePath("/leaderboard");
}

export async function addFixture(formData: FormData) {
  const supabase = await requireAdmin();

  const competitionId = Number(formData.get("competition_id"));
  const kickoffRaw = String(formData.get("kickoff_at") ?? "").trim();
  const gameNumber = String(formData.get("game_number") ?? "").trim();
  const homeTeam = String(formData.get("home_team") ?? "").trim();
  const awayTeam = String(formData.get("away_team") ?? "").trim();

  const externalFixtureId = readNullableApiFixtureId(
    formData.get("external_fixture_id")
  );

  const kickoff = parseKickoffDateTime(kickoffRaw);

  if (
    !Number.isFinite(competitionId) ||
    !kickoff ||
    !homeTeam ||
    !awayTeam
  ) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "Please enter a valid kickoff date/time, home team and away team."
      )}`
    );
  }

  const { error } = await supabase.from("fixtures").insert({
    competition_id: competitionId,
    fixture_label: kickoff.displayValue,
    kickoff_at: kickoff.displayValue,
    kickoff_sort_key: kickoff.sortKey,
    group_name: gameNumber || null,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: null,
    away_score: null,
    match_status: "scheduled",
    status: "scheduled",
    external_fixture_id: externalFixtureId,
  });

  if (error) {
    console.error("Unable to add fixture:", error.message);

    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "Fixture could not be added."
      )}`
    );
  }

  revalidateFixturePages();

  redirect(
    `/admin/fixtures?success=${encodeURIComponent(
      "Fixture added."
    )}`
  );
}

export async function updateFixture(formData: FormData) {
  const supabase = await requireAdmin();

  const fixtureId = Number(formData.get("fixture_id"));
  const competitionId = Number(formData.get("competition_id"));
  const kickoffRaw = String(formData.get("kickoff_at") ?? "").trim();
  const gameNumber = String(formData.get("game_number") ?? "").trim();
  const homeTeam = String(formData.get("home_team") ?? "").trim();
  const awayTeam = String(formData.get("away_team") ?? "").trim();
  const matchStatus = String(
    formData.get("match_status") ?? "scheduled"
  ).trim();

  const homeScore = readNullableScore(formData.get("home_score"));
  const awayScore = readNullableScore(formData.get("away_score"));

  const externalFixtureId = readNullableApiFixtureId(
    formData.get("external_fixture_id")
  );

  const kickoff = parseKickoffDateTime(kickoffRaw);

  if (
    !Number.isFinite(fixtureId) ||
    !Number.isFinite(competitionId) ||
    !kickoff ||
    !homeTeam ||
    !awayTeam
  ) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "Fixture could not be updated. Check the kickoff format: 11 Jun 2026 20:00."
      )}`
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .update({
      fixture_label: kickoff.displayValue,
      kickoff_at: kickoff.displayValue,
      kickoff_sort_key: kickoff.sortKey,
      group_name: gameNumber || null,
      home_team: homeTeam,
      away_team: awayTeam,
      home_score: homeScore,
      away_score: awayScore,
      match_status: matchStatus,
      status: matchStatus,
      external_fixture_id: externalFixtureId,
    })
    .eq("id", fixtureId);

  if (error) {
    console.error("Unable to update fixture:", error.message);

    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "Fixture could not be updated."
      )}`
    );
  }

  await supabase.rpc("recalculate_competition_scores", {
    p_competition_id: competitionId,
  });

  revalidateFixturePages();

  redirect(
    `/admin/fixtures?success=${encodeURIComponent(
      "Fixture updated."
    )}`
  );
}

export async function deleteFixture(formData: FormData) {
  const supabase = await requireAdmin();

  const fixtureId = Number(formData.get("fixture_id"));
  const competitionId = Number(formData.get("competition_id"));

  if (!Number.isFinite(fixtureId)) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "Fixture could not be deleted."
      )}`
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .delete()
    .eq("id", fixtureId);

  if (error) {
    console.error("Unable to delete fixture:", error.message);

    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "Fixture could not be deleted."
      )}`
    );
  }

  if (Number.isFinite(competitionId)) {
    await supabase.rpc("recalculate_competition_scores", {
      p_competition_id: competitionId,
    });
  }

  revalidateFixturePages();

  redirect(
    `/admin/fixtures?success=${encodeURIComponent(
      "Fixture deleted."
    )}`
  );
}

export async function unlinkApiFixture(formData: FormData) {
  const supabase = await requireAdmin();

  const fixtureId = Number(formData.get("fixture_id"));

  if (!Number.isFinite(fixtureId)) {
    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "API fixture could not be unlinked."
      )}`
    );
  }

  const { error } = await supabase
    .from("fixtures")
    .update({
      external_fixture_id: null,
    })
    .eq("id", fixtureId);

  if (error) {
    console.error("Unable to unlink API fixture:", error.message);

    redirect(
      `/admin/fixtures?error=${encodeURIComponent(
        "API fixture could not be unlinked."
      )}`
    );
  }

  revalidateFixturePages();

  redirect(
    `/admin/fixtures?success=${encodeURIComponent(
      "API fixture unlinked."
    )}`
  );
}