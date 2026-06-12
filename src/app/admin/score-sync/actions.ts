"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type ApiFixtureResponse = {
  response?: ApiFixture[];
};

type ApiFixture = {
  fixture: {
    id: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

function mapApiStatusToLocalStatus(
  apiStatus: string,
  homeScore: number | null,
  awayScore: number | null
) {
  const finishedStatuses = ["FT", "AET", "PEN"];
  const postponedStatuses = ["PST", "CANC", "ABD", "AWD", "WO"];
  const scheduledStatuses = ["TBD", "NS"];

  if (
    finishedStatuses.includes(apiStatus) &&
    homeScore !== null &&
    awayScore !== null
  ) {
    return "finished";
  }

  if (postponedStatuses.includes(apiStatus)) {
    return "postponed";
  }

  if (scheduledStatuses.includes(apiStatus)) {
    return "scheduled";
  }

  return "live";
}

export async function updateLinkedScoresFromApi() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    redirect(
      "/admin/score-sync?error=API_FOOTBALL_KEY is missing."
    );
  }

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (competitionError || !competition) {
    redirect(
      "/admin/score-sync?error=No active competition was found."
    );
  }

  const { data: linkedFixtures, error: fixturesError } =
    await supabase
      .from("fixtures")
      .select(
        "id, home_team, away_team, external_fixture_id"
      )
      .eq("competition_id", competition.id)
      .not("external_fixture_id", "is", null);

  if (fixturesError) {
    redirect(
      `/admin/score-sync?error=${encodeURIComponent(
        fixturesError.message
      )}`
    );
  }

  if (!linkedFixtures || linkedFixtures.length === 0) {
    redirect(
      "/admin/score-sync?error=No linked fixtures were found."
    );
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const fixture of linkedFixtures) {
    if (!fixture.external_fixture_id) {
      skippedCount += 1;
      continue;
    }

    try {
      const url = new URL(
        "https://v3.football.api-sports.io/fixtures"
      );

      url.searchParams.set(
        "id",
        String(fixture.external_fixture_id)
      );

      url.searchParams.set("timezone", "Europe/London");

      const response = await fetch(url.toString(), {
        headers: {
          "x-apisports-key": apiKey,
        },
        cache: "no-store",
      });

      const data: ApiFixtureResponse = await response.json();

      if (!response.ok || !data.response?.length) {
        skippedCount += 1;
        continue;
      }

      const apiFixture = data.response[0];

      const homeScore = apiFixture.goals.home;
      const awayScore = apiFixture.goals.away;

      const localStatus = mapApiStatusToLocalStatus(
        apiFixture.fixture.status.short,
        homeScore,
        awayScore
      );

      const updatePayload =
        homeScore !== null && awayScore !== null
          ? {
              home_score: homeScore,
              away_score: awayScore,
              status: localStatus,
              match_status: localStatus,
            }
          : {
              status: localStatus,
              match_status: localStatus,
            };

      const { error: updateError } = await supabase
        .from("fixtures")
        .update(updatePayload)
        .eq("id", fixture.id);

      if (updateError) {
        skippedCount += 1;
      } else {
        updatedCount += 1;
      }
    } catch (error) {
      console.error(
        `Unable to update fixture ${fixture.id}:`,
        error
      );

      skippedCount += 1;
    }
  }

  await supabase.rpc("recalculate_competition_scores", {
    p_competition_id: competition.id,
  });

  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/entries");
  revalidatePath("/admin/score-sync");

  redirect(
    `/admin/score-sync?success=${encodeURIComponent(
      `Score sync complete. Updated ${updatedCount} fixture(s). Skipped ${skippedCount} fixture(s).`
    )}`
  );
}