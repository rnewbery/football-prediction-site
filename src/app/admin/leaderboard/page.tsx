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

function formatPosition(position: number) {
  const lastTwoDigits = position % 100;
  const lastDigit = position % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${position}th`;
  }

  if (lastDigit === 1) {
    return `${position}st`;
  }

  if (lastDigit === 2) {
    return `${position}nd`;
  }

  if (lastDigit === 3) {
    return `${position}rd`;
  }

  return `${position}th`;
}

function getPositionClass(index: number) {
  if (index === 0) {
    return "position-badge position-first";
  }

  if (index === 1) {
    return "position-badge position-second";
  }

  if (index === 2) {
    return "position-badge position-third";
  }

  return "position-badge";
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

function buildCombinedCsv(
  leaderboard: LeaderboardEntry[],
  gameBreakdown: GameBreakdownEntry[]
) {
  const leaderboardHeaders = [
    "Position",
    "Participant",
    "Points",
    "Exact Scores",
  ];

  const leaderboardRows = leaderboard.map((entry, index) => [
    formatPosition(index + 1),
    entry.participant_name,
    entry.total_points,
    entry.exact_scores,
  ]);

  const breakdownHeaders = [
    "Week / Group",
    "Fixture",
    "Participant",
    "Prediction",
    "Result",
    "Points",
    "Exact score",
  ];

  const breakdownRows = gameBreakdown.map((entry) => [
    entry.group_name,
    entry.fixture_label,
    entry.participant_name,
    entry.predicted_score,
    entry.actual_score || "Not entered",
    entry.points_awarded,
    entry.is_exact_score ? "Yes" : "No",
  ]);

  return [
    ["Main leaderboard"],
    leaderboardHeaders,
    ...leaderboardRows,
    [],
    ["Game breakdown"],
    breakdownHeaders,
    ...breakdownRows,
  ]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

function groupBreakdownByGroup(gameBreakdown: GameBreakdownEntry[]) {
  return gameBreakdown.reduce<
    Record<string, GameBreakdownEntry[]>
  >((groups, entry) => {
    const groupName = entry.group_name || "Ungrouped";

    if (!groups[groupName]) {
      groups[groupName] = [];
    }

    groups[groupName].push(entry);

    return groups;
  }, {});
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
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load competition:",
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

  const groupedBreakdown = groupBreakdownByGroup(gameBreakdown);

  const csvContent = buildCombinedCsv(leaderboard, gameBreakdown);

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
            View, print and export the competition leaderboard.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      <section className="card">
        <h2>Main leaderboard</h2>

        {!competition ? (
          <p>No active competition is available.</p>
        ) : leaderboard.length === 0 ? (
          <p>No leaderboard entries are available yet.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Participant</th>
                    <th>Points</th>
                    <th>Exact scores</th>
                  </tr>
                </thead>

                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={`${entry.participant_name}-${index}`}
                    >
                      <td>
                        <span className={getPositionClass(index)}>
                          {formatPosition(index + 1)}
                        </span>
                      </td>

                      <td>{entry.participant_name}</td>
                      <td>{entry.total_points}</td>
                      <td>{entry.exact_scores}</td>
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
                Export leaderboard CSV
              </a>
            </div>
          </>
        )}
      </section>

      {competition && (
        <section className="card">
          <h2>Game breakdown</h2>

          {gameBreakdown.length === 0 ? (
            <p>No game breakdown is available yet.</p>
          ) : (
            Object.entries(groupedBreakdown).map(
              ([groupName, entries]) => (
                <div key={groupName}>
                  <h3>{groupName}</h3>

                  <div className="table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Fixture</th>
                          <th>Participant</th>
                          <th>Prediction</th>
                          <th>Result</th>
                          <th>Points</th>
                          <th>Exact</th>
                        </tr>
                      </thead>

                      <tbody>
                        {entries.map((entry) => (
                          <tr
                            key={`${entry.fixture_id}-${entry.participant_name}`}
                          >
                            <td>{entry.fixture_label}</td>
                            <td>{entry.participant_name}</td>
                            <td>{entry.predicted_score}</td>
                            <td>
                              {entry.actual_score ||
                                "Not entered"}
                            </td>
                            <td>{entry.points_awarded}</td>
                            <td>
                              {entry.is_exact_score ? "Yes" : "No"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )
          )}
        </section>
      )}
    </main>
  );
}