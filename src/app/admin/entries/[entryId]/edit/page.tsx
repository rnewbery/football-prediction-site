import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { updateEntryPredictions } from "../../actions";

type EditEntryPageProps = {
  params: Promise<{
    entryId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type FixtureRelationship = {
  fixture_label: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_sort_key: string | null;
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

export default async function EditEntryPage({
  params,
  searchParams,
}: EditEntryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const entryId = Number(resolvedParams.entryId);

  if (!entryId) {
    redirect("/admin/entries?error=Entry not found.");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data, error } = await supabase
    .from("entries")
    .select(
      `
      id,
      competition_id,
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
          away_score,
          kickoff_sort_key
        )
      )
    `
    )
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load entry:", error.message);
  }

  if (!data) {
    redirect("/admin/entries?error=Entry not found.");
  }

  const entry = data as unknown as Entry;

  const predictions = [...entry.predictions].sort((a, b) => {
    const firstKey = a.fixture?.kickoff_sort_key ?? "";
    const secondKey = b.fixture?.kickoff_sort_key ?? "";

    return firstKey.localeCompare(secondKey);
  });

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Edit entry</h1>

          <p className="intro">
            Update a participant&apos;s predicted scores if they
            entered something incorrectly.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin/entries">
          Back to entries
        </Link>
      </div>

      {resolvedSearchParams?.error && (
        <section className="card error-card">
          <p>{resolvedSearchParams.error}</p>
        </section>
      )}

      <section className="card">
        <h2>
          {entry.participant?.name ?? "Unnamed participant"}
        </h2>

        <p className="entry-meta">
          Entry reference: {entry.id}
        </p>

        <p className="entry-meta">
          Email: {entry.participant?.email ?? "Not provided"}
        </p>

        <p className="entry-meta">
          Submitted: {formatUkDateTime(entry.submitted_at)}
        </p>
      </section>

      <section className="card">
        <h2>Edit predicted scores</h2>

        <form action={updateEntryPredictions}>
          <input
            type="hidden"
            name="entry_id"
            value={entry.id}
          />

          <input
            type="hidden"
            name="competition_id"
            value={entry.competition_id}
          />

          <div className="table-wrapper">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Fixture</th>
                  <th>Home prediction</th>
                  <th>Away prediction</th>
                  <th>Current result</th>
                  <th>Current points</th>
                </tr>
              </thead>

              <tbody>
                {predictions.map((prediction) => {
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
                        {fixture
                          ? `${fixture.home_team} v ${fixture.away_team}`
                          : "Fixture unavailable"}
                      </td>

                      <td>
                        <input
                          className="score-input"
                          type="number"
                          min="0"
                          name={`prediction_${prediction.id}_home`}
                          defaultValue={
                            prediction.predicted_home_score
                          }
                          required
                        />
                      </td>

                      <td>
                        <input
                          className="score-input"
                          type="number"
                          min="0"
                          name={`prediction_${prediction.id}_away`}
                          defaultValue={
                            prediction.predicted_away_score
                          }
                          required
                        />
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

          <div className="form-actions">
            <button type="submit">
              Save changes
            </button>

            <Link
              className="button-link secondary"
              href="/admin/entries"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}