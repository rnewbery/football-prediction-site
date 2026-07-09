import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PrintButton from "@/app/leaderboard/PrintButton";

type LeaderboardEntry = {
  participant_name: string;
  total_points: number;
  exact_scores: number;
};

type GameBreakdownEntry = {
  group_name: string;
  fixture_id: number;
  fixture_label: string;
  fixture_sort_key: string;
  fixture_date: string | null;
  participant_name: string;
  predicted_score: string;
  actual_score: string;
  points_awarded: number;
  is_exact_score: boolean;
};

type BreakdownFixture = {
  fixture_id: number;
  fixture_label: string;
  fixture_sort_key: string;
  actual_score: string;
};

function getPointsCellClass(points: number | undefined) {
  if (points === undefined) {
    return "";
  }

  if (points >= 5) {
    return "breakdown-points-exact";
  }

  if (points === 3) {
    return "breakdown-points-strong";
  }

  if (points === 2) {
    return "breakdown-points-standard";
  }

  if (points === 1) {
    return "breakdown-points-low";
  }

  return "breakdown-points-zero";
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function buildBreakdownFixtures(
  gameBreakdown: GameBreakdownEntry[]
) {
  const fixtureMap = new Map<number, BreakdownFixture>();

  for (const entry of gameBreakdown) {
    const hasResult =
      entry.actual_score && entry.actual_score.trim() !== "";

    if (!hasResult) {
      continue;
    }

    if (!fixtureMap.has(entry.fixture_id)) {
      fixtureMap.set(entry.fixture_id, {
        fixture_id: entry.fixture_id,
        fixture_label: entry.fixture_label,
        fixture_sort_key: entry.fixture_sort_key,
        actual_score: entry.actual_score,
      });
    }
  }

  return Array.from(fixtureMap.values()).sort(
    (firstFixture, secondFixture) =>
      secondFixture.fixture_sort_key.localeCompare(
        firstFixture.fixture_sort_key
      )
  );
}

function buildBreakdownRows(
  leaderboard: LeaderboardEntry[],
  gameBreakdown: GameBreakdownEntry[]
) {
  const participantMap = new Map<
    string,
    Record<number, GameBreakdownEntry>
  >();

  for (const entry of gameBreakdown) {
    if (!participantMap.has(entry.participant_name)) {
      participantMap.set(entry.participant_name, {});
    }

    const cells = participantMap.get(entry.participant_name);

    if (cells) {
      cells[entry.fixture_id] = entry;
    }
  }

  return leaderboard.map((entry) => ({
    participant_name: entry.participant_name,
    total_points: entry.total_points,
    cells: participantMap.get(entry.participant_name) ?? {},
  }));
}

function buildBreakdownCsv(
  breakdownRows: ReturnType<typeof buildBreakdownRows>,
  breakdownFixtures: BreakdownFixture[]
) {
  const headers = [
    "Participant",
    "Total",
    ...breakdownFixtures.map(
      (fixture) =>
        `${fixture.fixture_label} (${fixture.actual_score})`
    ),
  ];

  const rows = breakdownRows.map((row) => [
    row.participant_name,
    row.total_points,
    ...breakdownFixtures.map((fixture) => {
      const cell = row.cells[fixture.fixture_id];

      return cell?.points_awarded ?? "";
    }),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export default async function AdminLeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, name")
      .eq("show_on_leaderboard", true)
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load current leaderboard competition:",
      competitionError.message
    );
  }

  let leaderboard: LeaderboardEntry[] = [];
  let gameBreakdown: GameBreakdownEntry[] = [];

  if (competition) {
    const { data, error } = await supabase.rpc(
      "get_competition_leaderboard",
      {
        p_competition_id: competition.id,
      }
    );

    if (error) {
      console.error(
        "Unable to load admin leaderboard:",
        error.message
      );
    } else {
      leaderboard = data ?? [];
    }

    const { data: breakdownData, error: breakdownError } =
      await supabase.rpc("get_competition_game_breakdown", {
        p_competition_id: competition.id,
      });

    if (breakdownError) {
      console.error(
        "Unable to load game breakdown:",
        breakdownError.message
      );
    } else {
      gameBreakdown = breakdownData ?? [];
    }
  }

  const breakdownFixtures = buildBreakdownFixtures(gameBreakdown);

  const breakdownRows = buildBreakdownRows(
    leaderboard,
    gameBreakdown
  );

  const csvContent = buildBreakdownCsv(
    breakdownRows,
    breakdownFixtures
  );

  const csvDownloadHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    csvContent
  )}`;

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Leaderboard</h1>

          <p className="intro">
            View, print and export the current competition points
            breakdown.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      {!competition ? (
        <section className="card">
          <h2>No current leaderboard</h2>

          <p>
            No competition is currently set to show on the public
            leaderboard.
          </p>

          <div className="form-actions">
            <Link
              className="button-link secondary"
              href="/admin/competitions"
            >
              Manage competitions
            </Link>
          </div>
        </section>
      ) : (
        <section className="card">
          <p className="eyebrow">{competition.name}</p>

          <h2>Game breakdown</h2>

          {breakdownFixtures.length === 0 ? (
            <p>No finished games are available for the breakdown yet.</p>
          ) : (
            <>
              <p className="input-help">
                Points for each finished fixture. The total column
                shows each participant’s overall score.
              </p>

              <div className="table-wrapper">
                <table className="breakdown-grid-table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Total</th>

                      {breakdownFixtures.map((fixture) => (
                        <th key={fixture.fixture_id}>
                          <span>{fixture.fixture_label}</span>

                          <small>
                            Result: {fixture.actual_score}
                          </small>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {breakdownRows.map((row) => (
                      <tr key={row.participant_name}>
                        <td className="breakdown-player-cell">
                          {row.participant_name}
                        </td>

                        <td className="breakdown-total-cell">
                          {row.total_points}
                        </td>

                        {breakdownFixtures.map((fixture) => {
                          const cell =
                            row.cells[fixture.fixture_id];

                          return (
                            <td
                              className={`breakdown-score-cell ${getPointsCellClass(
                                cell?.points_awarded
                              )}`}
                              key={`${row.participant_name}-${fixture.fixture_id}`}
                            >
                              {cell ? (
                                <strong>
                                  {cell.points_awarded}
                                </strong>
                              ) : (
                                <span>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="form-actions">
                <PrintButton />

                <a
                  className="button-link secondary"
                  href={csvDownloadHref}
                  download={`leaderboard-${competition.name
                    .toLowerCase()
                    .replaceAll(" ", "-")}.csv`}
                >
                  Export CSV
                </a>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}