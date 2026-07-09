import ExportEntriesButton from "./ExportEntriesButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { deleteEntry } from "./actions";

type EntriesPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type Competition = {
  id: number;
  name: string;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

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
  competition_id: number;
  submitted_at: string;
  payment_status: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  participant: ParticipantRelationship | null;
  predictions: Prediction[];
};

function formatUkDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCompetitionStatus(competition: Competition) {
  if (
    competition.accepting_entries &&
    competition.show_on_leaderboard
  ) {
    return "Open for entries and current leaderboard";
  }

  if (competition.accepting_entries) {
    return "Open for entries";
  }

  if (competition.show_on_leaderboard) {
    return "Current leaderboard";
  }

  return "Active";
}

export default async function EntriesPage({
  searchParams,
}: EntriesPageProps) {
  const resolvedSearchParams = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data: competitions, error: competitionsError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          accepting_entries,
          show_on_leaderboard
        `
      )
      .eq("is_active", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      });

  if (competitionsError) {
    console.error(
      "Unable to load competitions:",
      competitionsError.message
    );
  }

  const competitionIds =
    competitions?.map((competition) => competition.id) ?? [];

  const { data, error: entriesError } =
    competitionIds.length > 0
      ? await supabase
          .from("entries")
          .select(
            `
              id,
              competition_id,
              submitted_at,
              payment_status,
              approved_at,
              rejected_at,
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
            `
          )
          .in("competition_id", competitionIds)
          .order("submitted_at", { ascending: false })
      : { data: [], error: null };

  if (entriesError) {
    console.error(
      "Unable to load entries:",
      entriesError.message
    );
  }

  const entries = (data ?? []) as unknown as Entry[];

  const entriesByCompetition = new Map<number, Entry[]>();

  for (const entry of entries) {
    if (!entriesByCompetition.has(entry.competition_id)) {
      entriesByCompetition.set(entry.competition_id, []);
    }

    entriesByCompetition.get(entry.competition_id)?.push(entry);
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Participant entries</h1>

          <p className="intro">
            View submitted predictions, edit entries if someone made
            a mistake, or delete entries if needed.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      {resolvedSearchParams?.success && (
        <section className="card success-card">
          <p>{resolvedSearchParams.success}</p>
        </section>
      )}

      {resolvedSearchParams?.error && (
        <section className="card error-card">
          <p>{resolvedSearchParams.error}</p>
        </section>
      )}

      {!competitions || competitions.length === 0 ? (
        <section className="card">
          <h2>No active competitions</h2>

          <p>No active competitions are available.</p>

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
        competitions.map((competition) => {
          const competitionEntries =
            entriesByCompetition.get(competition.id) ?? [];

          return (
            <section className="card" key={competition.id}>
              <p className="eyebrow">
                {getCompetitionStatus(competition)}
              </p>

              <h2>{competition.name}</h2>

              <section className="admin-summary-grid">
                <article className="card admin-summary-card">
                  <span>Total entries</span>
                  <strong>{competitionEntries.length}</strong>
                </article>

                <article className="card admin-summary-card">
                  <span>Admin actions</span>
                  <strong>Edit or delete</strong>
                </article>
              </section>

              <div className="form-actions">
                <ExportEntriesButton entries={competitionEntries} />
              </div>

              {competitionEntries.length === 0 ? (
                <p>No entries have been submitted for this competition yet.</p>
              ) : (
                <section className="entries-list">
                  {competitionEntries.map((entry) => {
                    const totalPoints = entry.predictions.reduce(
                      (total, prediction) =>
                        total +
                        Number(prediction.points_awarded ?? 0),
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
                            <h3>
                              {entry.participant?.name ??
                                "Unnamed participant"}
                            </h3>

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
                              {formatUkDateTime(entry.submitted_at)}
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

                        <div className="entry-action-row">
                          <Link
                            className="button-link secondary"
                            href={`/admin/entries/${entry.id}/edit`}
                          >
                            Edit entry
                          </Link>

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
                        </div>

                        <div className="table-wrapper">
                          <table className="entries-table">
                            <thead>
                              <tr>
                                <th>Fixture</th>
                                <th>Prediction</th>
                                <th>Result</th>
                                <th>Points</th>
                              </tr>
                            </thead>

                            <tbody>
                              {entry.predictions.map(
                                (prediction) => {
                                  const fixture =
                                    prediction.fixture;

                                  const hasResult =
                                    fixture?.home_score !==
                                      null &&
                                    fixture?.home_score !==
                                      undefined &&
                                    fixture?.away_score !==
                                      null &&
                                    fixture?.away_score !==
                                      undefined;

                                  const actualResult = hasResult
                                    ? `${fixture.home_score} - ${fixture.away_score}`
                                    : "Not played";

                                  return (
                                    <tr key={prediction.id}>
                                      <td>
                                        {fixture
                                          ? `${fixture.home_team} v ${fixture.away_team}`
                                          : "Fixture unavailable"}
                                      </td>

                                      <td>
                                        {
                                          prediction.predicted_home_score
                                        }
                                        {" - "}
                                        {
                                          prediction.predicted_away_score
                                        }
                                      </td>

                                      <td>{actualResult}</td>

                                      <td>
                                        {
                                          prediction.points_awarded
                                        }

                                        {prediction.is_exact_score && (
                                          <span className="exact-badge">
                                            Exact
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}