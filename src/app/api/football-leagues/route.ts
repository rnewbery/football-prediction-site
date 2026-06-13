import { NextRequest, NextResponse } from "next/server";

type ApiLeagueResponse = {
  league?: {
    id?: number;
    name?: string;
    type?: string;
    logo?: string;
  };
  country?: {
    name?: string;
    code?: string;
  };
  seasons?: {
    year?: number;
    start?: string;
    end?: string;
    current?: boolean;
    coverage?: unknown;
  }[];
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  const search =
    request.nextUrl.searchParams.get("search") ?? "world cup";

  const season = request.nextUrl.searchParams.get("season");

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is missing." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(
      "https://v3.football.api-sports.io/leagues"
    );

    url.searchParams.set("search", search);

    if (season) {
      url.searchParams.set("season", season);
    }

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
          error: "API-Football leagues request failed.",
          details: data,
        },
        { status: response.status }
      );
    }

    const rawResults = (data.response ?? []) as ApiLeagueResponse[];

    const simplifiedResults = rawResults.map((item) => ({
      league_id: item.league?.id,
      league_name: item.league?.name,
      league_type: item.league?.type,
      country: item.country?.name,
      seasons: item.seasons?.map((seasonItem) => ({
        year: seasonItem.year,
        start: seasonItem.start,
        end: seasonItem.end,
        current: seasonItem.current,
      })),
    }));

    return NextResponse.json({
      search,
      season,
      results: simplifiedResults.length,
      response: simplifiedResults,
      raw: rawResults,
    });
  } catch (error) {
    console.error("League search error:", error);

    return NextResponse.json(
      { error: "Unable to contact API-Football." },
      { status: 500 }
    );
  }
}