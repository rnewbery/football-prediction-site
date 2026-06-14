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
    "Week / Group",
    "Fixture",
    "Participant",
    "Prediction",
    "Result",
    "Points",
    "Exact Score",
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

  const groupedBreakdown = groupBreakdownByGroup(gameBreakdown);

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
                        <th>Total Points</th>
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
                                {entry.is_exact_score
                                  ? "Yes"
                                  : "No"}
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
        </>
      )}
    </>
  );
}