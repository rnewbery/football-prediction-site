"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

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

type LeaderboardClientProps = {
  competitionId: number;
  firstPrize: string | null;
  secondPrize: string | null;
  thirdPrize: string | null;
  prizeNotes: string | null;
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

function getPointsCellClass(points: number | undefined) {
  if (points === undefined) {
    return "";
  }

  if (points >= 5) {
    return "breakdown-points-high";
  }

  if (points >= 3) {
    return "breakdown-points-medium";
  }

  if (points > 0) {
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

function buildCombinedCsv(
  leaderboard: LeaderboardEntry[],
  gameBreakdown: GameBreakdownEntry[]
) {
  const leaderboardHeaders = [
    "Position",
    "Participant",
    "Total Points",
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
    "Exact Score",
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

export default function LeaderboardClient({
  competitionId,
  firstPrize,
  secondPrize,
  thirdPrize,
  prizeNotes,
}: LeaderboardClientProps) {
  const [accessCode, setAccessCode] = useState("");
  const [leaderboard, setLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [gameBreakdown, setGameBreakdown] = useState<
    GameBreakdownEntry[]
  >([]);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnlocked, setHasUnlocked] = useState(false);

  const hasPrizes =
    firstPrize || secondPrize || thirdPrize || prizeNotes;

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

  async function handleUnlock(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedAccessCode = accessCode.trim();

    if (!trimmedAccessCode) {
      setMessage("Enter the competition access code.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "get_competition_leaderboard_with_code",
      {
        p_competition_id: competitionId,
        p_access_code: trimmedAccessCode,
      }
    );

    if (error) {
      console.log("Leaderboard access error:", error);

      setLeaderboard([]);
      setGameBreakdown([]);
      setHasUnlocked(false);
      setMessage(
        "The access code is incorrect. Please check it and try again."
      );
      setIsLoading(false);
      return;
    }

    const { data: breakdownData, error: breakdownError } =
      await supabase.rpc(
        "get_competition_game_breakdown_with_code",
        {
          p_competition_id: competitionId,
          p_access_code: trimmedAccessCode,
        }
      );

    if (breakdownError) {
      console.log("Game breakdown access error:", breakdownError);
      setGameBreakdown([]);
    } else {
      setGameBreakdown(breakdownData ?? []);
    }

    setLeaderboard(data ?? []);
    setHasUnlocked(true);
    setMessage("");
    setIsLoading(false);
  }

  return (
    <>
      {!hasUnlocked ? (
        <section className="card">
          <h2>Enter competition access code</h2>

          <p>
            The leaderboard is only available to people who have
            the competition code from the organiser.
          </p>

          <form onSubmit={handleUnlock}>
            <div className="form-grid">
              <div>
                <label htmlFor="leaderboard-access-code">
                  Access code
                </label>

                <input
                  id="leaderboard-access-code"
                  type="text"
                  value={accessCode}
                  onChange={(event) =>
                    setAccessCode(event.target.value)
                  }
                  required
                />
              </div>
            </div>

            {message && (
              <p className="form-message">{message}</p>
            )}

            <div className="form-actions">
              <button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Checking..."
                  : "View leaderboard"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          {hasPrizes && (
            <section className="card">
              <h2>Competition prizes</h2>

              <div className="competition-details">
                {firstPrize && (
                  <div>
                    <span>1st place</span>
                    <strong>{firstPrize}</strong>
                  </div>
                )}

                {secondPrize && (
                  <div>
                    <span>2nd place</span>
                    <strong>{secondPrize}</strong>
                  </div>
                )}

                {thirdPrize && (
                  <div>
                    <span>3rd place</span>
                    <strong>{thirdPrize}</strong>
                  </div>
                )}
              </div>

              {prizeNotes && (
                <p className="form-message">{prizeNotes}</p>
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
                        <th>Total points</th>
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
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => window.print()}
                  >
                    Print leaderboard
                  </button>

                  <a
                    className="button-link secondary"
                    href={csvDownloadHref}
                    download="competition-leaderboard.csv"
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
  <p>No finished games are available for the breakdown yet.</p>
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
                              {fixture.actual_score
                                ? `Result: ${fixture.actual_score}`
                                : "Result: not entered"}
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
    </>
  );
}