import { NextRequest, NextResponse } from "next/server";

type CompetitionKey =
  | "all"
  | "premier-league"
  | "world-cup"
  | "premier-league-and-world-cup";

type ApiFixture = {
  league?: {
    name?: string;
    country?: string;
  };
};

function fixtureMatchesCompetition(
  fixture: ApiFixture,
  competition: CompetitionKey
) {
  const leagueName = fixture.league?.name?.toLowerCase() ?? "";
  const country = fixture.league?.country?.toLowerCase() ?? "";

  const isPremierLeague =
    leagueName.includes("premier league") &&
    country.includes("england");

  const isWorldCup =
    leagueName.includes("world cup") ||
    leagueName.includes("fifa world cup");

  if (competition === "all") {
    return true;
  }

  if (competition === "premier-league") {
    return isPremierLeague;
  }

  if (competition === "world-cup") {
    return isWorldCup;
  }

  if (competition === "premier-league-and-world-cup") {
    return isPremierLeague || isWorldCup;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const date = request.nextUrl.searchParams.get("date");

  const competition =
    (request.nextUrl.searchParams.get("competition") as CompetitionKey | null) ??
    "premier-league-and-world-cup";

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is missing." },
      { status: 500 }
    );
  }

  if (!date) {
    return NextResponse.json(
      { error: "A date is required in YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(
      "https://v3.football.api-sports.io/fixtures"
    );

    url.searchParams.set("date", date);
    url.searchParams.set("timezone", "Europe/London");

    const response = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": apiKey,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "API-Football request failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    const allFixtures = data.response ?? [];

    const filteredFixtures = allFixtures.filter((fixture: ApiFixture) =>
      fixtureMatchesCompetition(fixture, competition)
    );

    return NextResponse.json({
      ...data,
      competition,
      results: filteredFixtures.length,
      totalResultsBeforeFiltering: allFixtures.length,
      response: filteredFixtures,
    });
  } catch (error) {
    console.error("Fixture search error:", error);

    return NextResponse.json(
      { error: "Unable to contact API-Football." },
      { status: 500 }
    );
  }
}