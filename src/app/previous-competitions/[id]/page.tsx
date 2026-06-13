import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PrintButton from "@/app/leaderboard/PrintButton";

type PreviousCompetitionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Competition = {
  id: number;
  name: string;
  entry_cost: number | null;
  closing_date: string | null;
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  prize_notes: string | null;
};

type LeaderboardEntry = {
  participant_name: string;
  total_points: number;
  exact_scores: number;
};

export default async function PreviousCompetitionDetailPage({
  params,
}: PreviousCompetitionPageProps) {
  const resolvedParams = await params;
  const competitionId = Number(resolvedParams.id);

  if (!Number.isFinite(competitionId)) {
    notFound();
  }

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          entry_cost,
          closing_date,
          first_prize,
          second_prize,
          third_prize,
          prize_notes
        `
      )
      .eq("id", competitionId)
      .eq("is_active", false)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load previous competition:",
      competitionError.message
    );
  }

  if (!competition) {
    notFound();
  }

  const previousCompetition = competition as Competition;

  const { data: leaderboardData, error: leaderboardError } =
    await supabase.rpc("get_competition_leaderboard", {
      p_competition_id: previousCompetition.id,
    });

  if (leaderboardError) {
    console.error(
      "Unable to load previous competition leaderboard:",
      leaderboardError.message
    );
  }

  const leaderboard =
    (leaderboardData ?? []) as LeaderboardEntry[];

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Previous competition</p>

          <h1>{previousCompetition.name}</h1>

          <p className="intro">
            Final leaderboard and competition details.
          </p>
        </div>

        <Link
          className="button-link secondary"
          href="/previous-competitions"
        >
          Back to previous competitions
        </Link>
      </div>

      <section className="card">
        <h2>Competition details</h2>

        <div className="competition-details">
          <div>
            <span>Entry cost</span>

            <strong>
              {previousCompetition.entry_cost !== null
                ? `£${Number(
                    previousCompetition.entry_cost
                  ).toFixed(2)}`
                : "Not recorded"}
            </strong>
          </div>

          <div>
            <span>Closed</span>

            <strong>
              {previousCompetition.closing_date
                ? new Date(
                    previousCompetition.closing_date
                  ).toLocaleString("en-GB")
                : "Not recorded"}
            </strong>
          </div>
        </div>
      </section>

      {(previousCompetition.first_prize ||
        previousCompetition.second_prize ||
        previousCompetition.third_prize ||
        previousCompetition.prize_notes) && (
        <section className="card">
          <h2>Prizes</h2>

          <div className="competition-details">
            {previousCompetition.first_prize && (
              <div>
                <span>1st place</span>
                <strong>{previousCompetition.first_prize}</strong>
              </div>
            )}

            {previousCompetition.second_prize && (
              <div>
                <span>2nd place</span>
                <strong>{previousCompetition.second_prize}</strong>
              </div>
            )}

            {previousCompetition.third_prize && (
              <div>
                <span>3rd place</span>
                <strong>{previousCompetition.third_prize}</strong>
              </div>
            )}
          </div>

          {previousCompetition.prize_notes && (
            <p className="entry-meta">
              {previousCompetition.prize_notes}
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2>Final leaderboard</h2>

        {leaderboard.length === 0 ? (
          <p>No approved entries were recorded.</p>
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
              <PrintButton />
            </div>
          </>
        )}
      </section>
    </main>
  );
}