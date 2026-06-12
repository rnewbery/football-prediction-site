import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LeaderboardEntry = {
  participant_name: string;
  total_points: number;
  exact_scores: number;
};

export default async function LeaderboardPage() {
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

  if (competition) {
    const { data, error } = await supabase.rpc(
      "get_competition_leaderboard",
      {
        p_competition_id: competition.id,
      }
    );

    if (error) {
      console.error(
        "Unable to load leaderboard:",
        error.message
      );
    } else {
      leaderboard = data ?? [];
    }
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">
            {competition?.name ?? "Current competition"}
          </p>

          <h1>Leaderboard</h1>

          <p className="intro">
            See the latest positions and points for the competition.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      <section className="card">
        {!competition ? (
          <p>No active competition is available.</p>
        ) : leaderboard.length === 0 ? (
          <p>No competition entries are available yet.</p>
        ) : (
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
        )}
      </section>
    </main>
  );
}