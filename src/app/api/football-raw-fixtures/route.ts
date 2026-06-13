import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is missing." },
      { status: 500 }
    );
  }

  const league = request.nextUrl.searchParams.get("league") ?? "1";
  const season =
    request.nextUrl.searchParams.get("season") ?? "2026";

  const url = new URL(
    "https://v3.football.api-sports.io/fixtures"
  );

  url.searchParams.set("league", league);
  url.searchParams.set("season", season);
  url.searchParams.set("timezone", "Europe/London");

  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  const data = await response.json();

  return NextResponse.json({
    requestedUrl: url.toString().replace(apiKey, "[hidden]"),
    httpStatus: response.status,
    apiResponse: data,
  });
}