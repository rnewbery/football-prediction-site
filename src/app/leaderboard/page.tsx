import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

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

function formatPosition(position: number) {
  const lastTwoDigits = position % 100;
  const lastDigit = position % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${position}th`;
  }

  if (lastDigit === 1) return `${position}st`;
  if (lastDigit === 2) return `${position}nd`;
  if (lastDigit === 3) return `${position}rd`;

  return `${position}th`;
}

function getPositionClass(index: number) {
  if (index === 0) return "position-badge position-first";
  if (index === 1) return "position-badge position-second";
  if (index === 2) return "position-badge position-third";

  return "position-badge";
}

function getPointsCellClass(points: number | undefined) {
  if (points === undefined) return "";
  if (points >= 5) return "breakdown-points-high";
  if (points >= 3) return "breakdown-points-medium";
  if (points > 0) return "breakdown-points-low";

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
    "Fixture",
    "Participant",
    "Result",
    "Points",
    "Exact score",
  ];

  const breakdownRows = gameBreakdown.map((entry) => [
    entry.fixture_label,
    entry.participant_name,
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

export default async function LeaderboardPage() {
  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          first_prize,
          second_prize,
          third_prize,
          prize_notes
        `
      )
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
        "Unable to load public leaderboard:",
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
        "Unable to load public game breakdown:",
        breakdownError.message
      );
    } else {
      gameBreakdown = breakdownData ?? [];
    }
  }

  const hasPrizes =
    competition?.first_prize ||
    competition?.second_prize ||
    competition?.third_prize ||
    competition?.prize_notes;

  const breakdownFixtures = buildBreakdownFixtures(gameBreakdown);

  const breakdownRows = buildBreakdownRows(
    leaderboard,
    gameBreakdown
  );

  const hasAnyResults = gameBreakdown.some(
    (entry) => entry.actual_score && entry.actual_score.trim() !== ""
  );

  const csvContent = buildCombinedCsv(leaderboard, gameBreakdown);

  const csvDownloadHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    csvContent
  )}`;

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">
            {competition?.name ?? "Current competition"}
          </p>

          <h1>Leaderboard</h1>

          <p className="intro">
            View the current competition leaderboard and game
            breakdown.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : (
        <>
          {hasPrizes && (
            <section className="card">
              <h2>Competition prizes</h2>

              <div className="competition-details">
                {competition.first_prize && (
                  <div>
                    <span>1st place</span>
                    <strong>{competition.first_prize}</strong>
                  </div>
                )}

                {competition.second_prize && (
                  <div>
                    <span>2nd place</span>
                    <strong>{competition.second_prize}</strong>
                  </div>
                )}

                {competition.third_prize && (
                  <div>
                    <span>3rd place</span>
                    <strong>{competition.third_prize}</strong>
                  </div>
                )}
              </div>

              {competition.prize_notes && (
                <p className="form-message">
                  {competition.prize_notes}
                </p>
              )}
            </section>
          )}

          <section className="card">
            <h2>Main leaderboard</h2>

            {leaderboard.length === 0 ? (
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
                            {hasAnyResults ? (
                              <span className={getPositionClass(index)}>
                                {formatPosition(index + 1)}
                              </span>
                            ) : (
                              <span className="position-badge position-pending">
                                -
                              </span>
                            )}
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

          <section className="card">
            <h2>Game breakdown</h2>

            {breakdownFixtures.length === 0 ? (
              <p>
                No finished games are available for the breakdown yet.
              </p>
            ) : (
              <>
                <p className="input-help">
                  Scores for all finished fixtures.
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
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}