import { NextRequest, NextResponse } from "next/server";

type CompetitionFilter =
  | "all"
  | "premier-league"
  | "world-cup"
  | "premier-league-and-world-cup";

type ApiFixture = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      long?: string;
      short?: string;
    };
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
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type LeagueSearch = {
  league: string;
  season: string;
  label: string;
};

function normaliseCompetitionFilter(
  value: string | null
): CompetitionFilter {
  const cleaned = String(value ?? "all")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");

  if (
    cleaned === "all" ||
    cleaned === "premier-league" ||
    cleaned === "world-cup" ||
    cleaned === "premier-league-and-world-cup"
  ) {
    return cleaned;
  }

  return "all";
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDatesInRange(dateFrom: string, dateTo: string) {
  const dates: string[] = [];

  const currentDate = new Date(`${dateFrom}T00:00:00Z`);
  const endDate = new Date(`${dateTo}T00:00:00Z`);

  while (currentDate <= endDate) {
    dates.push(toDateOnly(currentDate));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

function getUkDateOnly(value: string) {
  const date = new Date(value);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function fixtureIsInsideDateRange(
  fixture: ApiFixture,
  dateFrom: string | null,
  dateTo: string | null
) {
  if (!dateFrom || !dateTo) {
    return true;
  }

  const fixtureDate = fixture.fixture?.date;

  if (!fixtureDate) {
    return false;
  }

  const ukDate = getUkDateOnly(fixtureDate);

  return ukDate >= dateFrom && ukDate <= dateTo;
}

function fixtureMatchesSearch(fixture: ApiFixture, search: string) {
  const cleanedSearch = search.trim().toLowerCase();

  if (!cleanedSearch) {
    return true;
  }

  const searchableText = [
    fixture.league?.name,
    fixture.league?.country,
    fixture.teams?.home?.name,
    fixture.teams?.away?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(cleanedSearch);
}

function getLeagueSearches(
  competitionFilter: CompetitionFilter,
  seasonOverride: string | null
): LeagueSearch[] {
  const searches: LeagueSearch[] = [];

  if (
    competitionFilter === "premier-league" ||
    competitionFilter === "premier-league-and-world-cup"
  ) {
    searches.push({
      league: "39",
      season: seasonOverride ?? "2025",
      label: "Premier League",
    });
  }

  if (
    competitionFilter === "world-cup" ||
    competitionFilter === "premier-league-and-world-cup"
  ) {
    searches.push({
      league: "1",
      season: seasonOverride ?? "2026",
      label: "World Cup",
    });
  }

  return searches;
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

  return {
    fixtures: (data.response ?? []) as ApiFixture[],
    errors: data.errors ?? {},
    results: data.results ?? 0,
    parameters: data.parameters ?? {},
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  const dateFrom = request.nextUrl.searchParams.get("date_from");
  const dateTo = request.nextUrl.searchParams.get("date_to");
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const seasonOverride = request.nextUrl.searchParams.get("season");

  const competitionFilter = normaliseCompetitionFilter(
    request.nextUrl.searchParams.get("competition_filter")
  );

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is missing." },
      { status: 500 }
    );
  }

  if ((dateFrom && !isValidDate(dateFrom)) || (dateTo && !isValidDate(dateTo))) {
    return NextResponse.json(
      {
        error:
          "date_from and date_to must be in YYYY-MM-DD format.",
      },
      { status: 400 }
    );
  }

  if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
    return NextResponse.json(
      {
        error:
          "Please provide both date_from and date_to, or neither.",
      },
      { status: 400 }
    );
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json(
      { error: "date_from cannot be later than date_to." },
      { status: 400 }
    );
  }

  try {
    const allFixtures: ApiFixture[] = [];
    const apiErrors: string[] = [];
    const apiMessages: unknown[] = [];

    const leagueSearches = getLeagueSearches(
      competitionFilter,
      seasonOverride
    );

    if (leagueSearches.length > 0) {
      for (const leagueSearch of leagueSearches) {
        try {
          const url = new URL(
            "https://v3.football.api-sports.io/fixtures"
          );

          url.searchParams.set("league", leagueSearch.league);
          url.searchParams.set("season", leagueSearch.season);
          url.searchParams.set("timezone", "Europe/London");

          const result = await fetchApiFixtures(url, apiKey);

          if (
            result.errors &&
            typeof result.errors === "object" &&
            Object.keys(result.errors).length > 0
          ) {
            apiErrors.push(
              `${leagueSearch.label} API error: ${JSON.stringify(
                result.errors
              )}`
            );
          }

          allFixtures.push(...result.fixtures);
          apiMessages.push({
            label: leagueSearch.label,
            parameters: result.parameters,
            results: result.results,
            errors: result.errors,
          });
        } catch (error) {
          apiErrors.push(
            `${leagueSearch.label} search failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    } else {
      if (!dateFrom || !dateTo) {
        return NextResponse.json(
          {
            error:
              "For all-competition searches, please provide date_from and date_to.",
          },
          { status: 400 }
        );
      }

      const datesToSearch = getDatesInRange(dateFrom, dateTo);

      if (datesToSearch.length > 31) {
        return NextResponse.json(
          {
            error:
              "Please search a date range of 31 days or fewer at a time.",
          },
          { status: 400 }
        );
      }

      for (const date of datesToSearch) {
        try {
          const url = new URL(
            "https://v3.football.api-sports.io/fixtures"
          );

          url.searchParams.set("date", date);
          url.searchParams.set("timezone", "Europe/London");

          const result = await fetchApiFixtures(url, apiKey);

          if (
            result.errors &&
            typeof result.errors === "object" &&
            Object.keys(result.errors).length > 0
          ) {
            apiErrors.push(
              `Date ${date} API error: ${JSON.stringify(
                result.errors
              )}`
            );
          }

          allFixtures.push(...result.fixtures);
          apiMessages.push({
            date,
            parameters: result.parameters,
            results: result.results,
            errors: result.errors,
          });
        } catch (error) {
          apiErrors.push(
            `Date search failed for ${date}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    const uniqueFixtures = Array.from(
      new Map(
        allFixtures
          .filter((fixture) => fixture.fixture?.id)
          .map((fixture) => [fixture.fixture?.id, fixture])
      ).values()
    );

    const filteredFixtures = uniqueFixtures
      .filter((fixture) =>
        fixtureIsInsideDateRange(fixture, dateFrom, dateTo)
      )
      .filter((fixture) => fixtureMatchesSearch(fixture, search))
      .sort((firstFixture, secondFixture) => {
        const firstDate = firstFixture.fixture?.date ?? "";
        const secondDate = secondFixture.fixture?.date ?? "";

        return firstDate.localeCompare(secondDate);
      });

    const leagueSummary = Array.from(
      new Set(
        filteredFixtures.map((fixture) => {
          const leagueId = fixture.league?.id ?? "Unknown ID";
          const leagueName =
            fixture.league?.name ?? "Unknown league";
          const country =
            fixture.league?.country ?? "Unknown country";
          const fixtureSeason =
            fixture.league?.season ?? "Unknown season";

          return `${leagueId} · ${leagueName} (${country}) · ${fixtureSeason}`;
        })
      )
    ).sort();

    return NextResponse.json({
      competition_filter: competitionFilter,
      date_from: dateFrom,
      date_to: dateTo,
      search,
      season_override: seasonOverride,
      results: filteredFixtures.length,
      totalResultsBeforeFiltering: uniqueFixtures.length,
      leaguesReturned: leagueSummary,
      apiErrors,
      apiMessages,
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