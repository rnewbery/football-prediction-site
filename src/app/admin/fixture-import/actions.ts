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

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());

  return values;
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

  return {
    displayValue: `${Number(dayText)} ${monthText.slice(0, 3)} ${yearText} ${hour}:${minute}`,
    sortKey: `${yearText}-${monthNumber}-${day} ${hour}:${minute}`,
  };
}

export async function importFixtures(formData: FormData) {
  const supabase = await requireAdmin();

  const rawCsv = String(formData.get("fixture_csv") ?? "").trim();

  if (!rawCsv) {
    redirect(
      `/admin/fixture-import?error=${encodeURIComponent(
        "Please paste fixture rows before importing."
      )}`
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
    console.error(
      "Unable to load active competition:",
      competitionError?.message
    );

    redirect(
      `/admin/fixture-import?error=${encodeURIComponent(
        "No active competition was found."
      )}`
    );
  }

  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    redirect(
      `/admin/fixture-import?error=${encodeURIComponent(
        "Please include a header row and at least one fixture row."
      )}`
    );
  }

  const header = parseCsvLine(lines[0]).map((value) =>
    value.toLowerCase().replace(/\s+/g, "_")
  );

  const gameNumberIndex = header.indexOf("game_number");
  const kickoffAtIndex = header.indexOf("kickoff_at");
  const homeTeamIndex = header.indexOf("home_team");
  const awayTeamIndex = header.indexOf("away_team");

  if (
    gameNumberIndex === -1 ||
    kickoffAtIndex === -1 ||
    homeTeamIndex === -1 ||
    awayTeamIndex === -1
  ) {
    redirect(
      `/admin/fixture-import?error=${encodeURIComponent(
        "CSV must include these headers: game_number, kickoff_at, home_team, away_team."
      )}`
    );
  }

  const fixtureRows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    const kickoff = parseKickoffDateTime(
      values[kickoffAtIndex] ?? ""
    );

    return {
      competition_id: competition.id,
      group_name: values[gameNumberIndex] ?? "",
      fixture_label: kickoff?.displayValue ?? "",
      kickoff_at: kickoff?.displayValue ?? "",
      kickoff_sort_key: kickoff?.sortKey ?? "",
      home_team: values[homeTeamIndex] ?? "",
      away_team: values[awayTeamIndex] ?? "",
      home_score: null,
      away_score: null,
      match_status: "scheduled",
      status: "scheduled",
      external_fixture_id: null,
    };
  });

  const invalidRow = fixtureRows.find(
    (row) =>
      !row.group_name ||
      !row.kickoff_at ||
      !row.kickoff_sort_key ||
      !row.home_team ||
      !row.away_team
  );

  if (invalidRow) {
    redirect(
      `/admin/fixture-import?error=${encodeURIComponent(
        "One or more rows are missing data, or the kickoff date is not in this format: 11 Jun 2026 20:00."
      )}`
    );
  }

  const { error: insertError } = await supabase
    .from("fixtures")
    .insert(fixtureRows);

  if (insertError) {
    console.error("Unable to import fixtures:", insertError.message);

    redirect(
      `/admin/fixture-import?error=${encodeURIComponent(
        "Fixtures could not be imported."
      )}`
    );
  }

  revalidatePath("/admin/fixtures");
  revalidatePath("/admin/fixture-import");
  revalidatePath("/predict");

  redirect(
    `/admin/fixture-import?success=${encodeURIComponent(
      `${fixtureRows.length} fixtures imported.`
    )}`
  );
}