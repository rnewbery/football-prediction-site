import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { deleteEntry } from "./actions";

type FixtureRelationship = {
  fixture_label: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

type Prediction = {
  id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number;
  is_exact_score: boolean;
  fixture: FixtureRelationship | null;
};

type ParticipantRelationship = {
  name: string;
  email: string | null;
};

type Entry = {
  id: number;
  submitted_at: string;
  participant: ParticipantRelationship | null;
  predictions: Prediction[];
};

export default async function EntriesPage() {
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

  const { data, error: entriesError } = competition
    ? await supabase
        .from("entries")
        .select(`
          id,
          submitted_at,
          participant:participants!entries_participant_id_fkey (
            name,
            email
          ),
          predictions (
            id,
            predicted_home_score,
            predicted_away_score,
            points_awarded,
            is_exact_score,
            fixture:fixtures!predictions_fixture_id_fkey (
              fixture_label,
              group_name,
              home_team,
              away_team,
              home_score,
              away_score
            )
          )
        `)
        .eq("competition_id", competition.id)
        .order("submitted_at", { ascending: false })
    : { data: [], error: null };

  if (entriesError) {
    console.error(
      "Unable to load entries:",
      entriesError.message
    );
  }

  const entries = (data ?? []) as unknown as Entry[];

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Participant entries</h1>

          <p className="intro">
            Review submitted predictions and points for the current
            competition.
          </p>
        </div>

        <Link
          className="button-link secondary"
          href="/admin"
        >
          Back to dashboard
        </Link>
      </div>

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : entries.length === 0 ? (
        <section className="card">
          <p>No entries have been submitted yet.</p>
        </section>
      ) : (
        <section className="entries-list">
          {entries.map((entry) => {
            const totalPoints = entry.predictions.reduce(
              (total, prediction) =>
                total + Number(prediction.points_awarded ?? 0),
              0
            );

            const exactScores = entry.predictions.filter(
              (prediction) => prediction.is_exact_score
            ).length;

            return (
              <article
                className="card entry-card"
                key={entry.id}
              >
                <div className="entry-header">
                  <div>
                    <h2>
                      {entry.participant?.name ??
                        "Unnamed participant"}
                    </h2>

                    <p className="entry-meta">
                      Entry reference: {entry.id}
                    </p>

                    <p className="entry-meta">
                      Email:{" "}
                      {entry.participant?.email ??
                        "Not provided"}
                    </p>

                    <p className="entry-meta">
                      Submitted:{" "}
                      {new Date(
                        entry.submitted_at
                      ).toLocaleString("en-GB")}
                    </p>
                  </div>

                  <div className="entry-score-summary">
                    <div>
                      <span>Points</span>
                      <strong>{totalPoints}</strong>
                    </div>

                    <div>
                      <span>Exact scores</span>
                      <strong>{exactScores}</strong>
                    </div>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="entries-table">
                    <thead>
                      <tr>
                        <th>Game No.</th>
                        <th>Fixture</th>
                        <th>Prediction</th>
                        <th>Result</th>
                        <th>Points</th>
                      </tr>
                    </thead>

                    <tbody>
                      {entry.predictions.map((prediction) => {
                        const fixture = prediction.fixture;

                        const hasResult =
                          fixture?.home_score !== null &&
                          fixture?.home_score !== undefined &&
                          fixture?.away_score !== null &&
                          fixture?.away_score !== undefined;

                        const actualResult = hasResult
                          ? `${fixture.home_score} - ${fixture.away_score}`
                          : "Not played";

                        return (
                          <tr key={prediction.id}>
                            <td>
                              {fixture?.group_name ?? ""}
                            </td>

                            <td>
                              {fixture
                                ? `${fixture.home_team} v ${fixture.away_team}`
                                : "Fixture unavailable"}
                            </td>

                            <td>
                              {prediction.predicted_home_score}
                              {" - "}
                              {prediction.predicted_away_score}
                            </td>

                            <td>{actualResult}</td>

                            <td>
                              {prediction.points_awarded}

                              {prediction.is_exact_score && (
                                <span className="exact-badge">
                                  Exact
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <form action={deleteEntry}>
                  <input
                    type="hidden"
                    name="entry_id"
                    value={entry.id}
                  />

                  <input
                    type="hidden"
                    name="competition_id"
                    value={competition.id}
                  />

                  <button
                    className="danger-button"
                    type="submit"
                  >
                    Delete entry
                  </button>
                </form>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}