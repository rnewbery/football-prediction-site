import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY is missing." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      "https://v3.football.api-sports.io/status",
      {
        headers: {
          "x-apisports-key": apiKey,
        },
        cache: "no-store",
      }
    );

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

    return NextResponse.json(data);
  } catch (error) {
    console.error("API-Football test error:", error);

    return NextResponse.json(
      { error: "Unable to contact API-Football." },
      { status: 500 }
    );
  }
}