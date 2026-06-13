"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type LeaderboardEntry = {
  participant_name: string;
  total_points: number;
  exact_scores: number;
};

type LeaderboardClientProps = {
  competitionId: number;
  firstPrize: string | null;
  secondPrize: string | null;
  thirdPrize: string | null;
  prizeNotes: string | null;
};

function csvEscape(value: string | number | null | undefined) {
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

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnlocked, setHasUnlocked] = useState(false);

  const hasPrizes =
    firstPrize || secondPrize || thirdPrize || prizeNotes;

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
      setHasUnlocked(false);
      setMessage(
        "The access code is incorrect. Please check it and try again."
      );
      setIsLoading(false);
      return;
    }

    setLeaderboard(data ?? []);
    setHasUnlocked(true);
    setMessage("");
    setIsLoading(false);
  }

  function downloadLeaderboardCsv() {
    const headers = [
      "Position",
      "Participant",
      "Points",
      "Exact scores",
    ];

    const rows = leaderboard.map((entry, index) => [
      index + 1,
      entry.participant_name,
      entry.total_points,
      entry.exact_scores,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `leaderboard-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
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
            {leaderboard.length === 0 ? (
              <p>
                No approved competition entries are available yet.
                Entries only appear here once payment has been
                confirmed.
              </p>
            ) : (
              <>
                <p className="form-message">
                  Only paid and approved entries are shown.
                </p>

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
                            <strong>{index + 1}</strong>
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

                  <button
                    className="secondary-button"
                    type="button"
                    onClick={downloadLeaderboardCsv}
                  >
                    Export leaderboard CSV
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}