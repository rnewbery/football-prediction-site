import { NextRequest, NextResponse } from "next/server";

type CompetitionKey =
  | "all"
  | "premier-league"
  | "world-cup"
  | "premier-league-and-world-cup";

type ApiFixture = {
  fixture?: {
    id?: number;
    date?: string;
  };
  league?: {
    id?: number;
    name?: string;
    country?: string;
    season?: number;
  };
  teams?: {
    home?: {
      name?: string;
    };
    away?: {
      name?: string;
    };
  };
};

function fixtureMatchesCompetition(
  fixture: ApiFixture,
  competition: CompetitionKey
) {
  const leagueId = fixture.league?.id;
  const leagueName = fixture.league?.name?.toLowerCase() ?? "";
  const country = fixture.league?.country?.toLowerCase() ?? "";

  const isPremierLeague =
    leagueName.includes("premier league") &&
    country.includes("england");

  const isWorldCup =
    leagueId === 1 ||
    leagueName.includes("world cup") ||
    leagueName.includes("fifa");

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

function searchIncludesWorldCup(competition: CompetitionKey) {
  return (
    competition === "world-cup" ||
    competition === "premier-league-and-world-cup" ||
    competition === "all"
  );
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDatesInRangeWithBuffer(dateFrom: string, dateTo: string) {
  const dates: string[] = [];

  const currentDate = new Date(`${dateFrom}T00:00:00`);
  currentDate.setDate(currentDate.getDate() - 1);

  const endDate = new Date(`${dateTo}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);

  while (currentDate <= endDate) {
    dates.push(toDateOnly(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

function getUkDateOnly(value: string) {
  const date = new Date(value);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function fixtureFallsInsideRequestedUkRange(
  fixture: ApiFixture,
  dateFrom: string,
  dateTo: string
) {
  const fixtureDate = fixture.fixture?.date;

  if (!fixtureDate) {
    return false;
  }

  const ukDate = getUkDateOnly(fixtureDate);

  return ukDate >= dateFrom && ukDate <= dateTo;
}

async function fetchApiFixtures(url: URL, apiKey: string) {
  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `API-Football request failed with status ${response.status}: ${JSON.stringify(
        data
      )}`
    );
  }

  return (data.response ?? []) as ApiFixture[];
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  const dateFrom = request.nextUrl.searchParams.get("date_from");
  const dateTo = request.nextUrl.searchParams.get("date_to");

  const competition =
    (request.nextUrl.searchParams.get(
      "competition_filter"
    ) as CompetitionKey | null) ??
    "premier-league-and-world-cup";

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is missing." },
      { status: 500 }
    );
  }

  if (
    !dateFrom ||
    !dateTo ||
    !isValidDate(dateFrom) ||
    !isValidDate(dateTo)
  ) {
    return NextResponse.json(
      {
        error:
          "A date_from and date_to are required in YYYY-MM-DD format.",
      },
      { status: 400 }
    );
  }

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { error: "date_from cannot be later than date_to." },
      { status: 400 }
    );
  }

  const datesToSearch = getDatesInRangeWithBuffer(dateFrom, dateTo);

  if (datesToSearch.length > 35) {
    return NextResponse.json(
      {
        error:
          "Please search a date range of 31 days or fewer at a time.",
      },
      { status: 400 }
    );
  }

  try {
    const allFixtures: ApiFixture[] = [];
    const apiErrors: string[] = [];

    for (const date of datesToSearch) {
      try {
        const url = new URL(
          "https://v3.football.api-sports.io/fixtures"
        );

        url.searchParams.set("date", date);
        url.searchParams.set("timezone", "Europe/London");

        const fixtures = await fetchApiFixtures(url, apiKey);
        allFixtures.push(...fixtures);
      } catch (error) {
        apiErrors.push(
          `Date search failed for ${date}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (searchIncludesWorldCup(competition)) {
      try {
        const worldCupUrl = new URL(
          "https://v3.football.api-sports.io/fixtures"
        );

        worldCupUrl.searchParams.set("league", "1");
        worldCupUrl.searchParams.set("season", "2026");
        worldCupUrl.searchParams.set("timezone", "Europe/London");

        const worldCupFixtures = await fetchApiFixtures(
          worldCupUrl,
          apiKey
        );

        allFixtures.push(...worldCupFixtures);
      } catch (error) {
        apiErrors.push(
          `World Cup season search failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const uniqueFixtures = Array.from(
      new Map(
        allFixtures
          .filter((fixture) => fixture.fixture?.id)
          .map((fixture) => [fixture.fixture?.id, fixture])
      ).values()
    );

    const fixturesInsideRequestedRange = uniqueFixtures.filter(
      (fixture) =>
        fixtureFallsInsideRequestedUkRange(
          fixture,
          dateFrom,
          dateTo
        )
    );

    const filteredFixtures = fixturesInsideRequestedRange
      .filter((fixture) =>
        fixtureMatchesCompetition(fixture, competition)
      )
      .sort((firstFixture, secondFixture) => {
        const firstDate = firstFixture.fixture?.date ?? "";
        const secondDate = secondFixture.fixture?.date ?? "";

        return firstDate.localeCompare(secondDate);
      });

    const leagueSummary = Array.from(
      new Set(
        fixturesInsideRequestedRange.map((fixture) => {
          const leagueId =
            fixture.league?.id ?? "Unknown ID";

          const leagueName =
            fixture.league?.name ?? "Unknown league";

          const country =
            fixture.league?.country ?? "Unknown country";

          const season =
            fixture.league?.season ?? "Unknown season";

          return `${leagueId} · ${leagueName} (${country}) · ${season}`;
        })
      )
    ).sort();

    return NextResponse.json({
      competition,
      date_from: dateFrom,
      date_to: dateTo,
      searchedApiDates: datesToSearch,
      usedWorldCupSeasonFallback: searchIncludesWorldCup(competition),
      results: filteredFixtures.length,
      totalResultsBeforeFiltering: fixturesInsideRequestedRange.length,
      totalResultsIncludingBufferAndFallback: uniqueFixtures.length,
      leaguesReturnedBeforeFiltering: leagueSummary,
      apiErrors,
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