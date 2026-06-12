import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { updateCompetition } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: competition } = await supabase
    .from("competitions")
    .select(`
      id,
      name,
      entry_cost,
      closing_date,
      exact_score_points,
      correct_result_points,
      incorrect_result_points
    `)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const closingDateValue = competition?.closing_date
    ? new Date(competition.closing_date)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>
          <h1>Competition settings</h1>

          <p className="intro">
            Edit the competition details and scoring rules.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      {params.error && (
        <p className="form-message error-message">
          {params.error}
        </p>
      )}

      {params.success && (
        <p className="form-message success-message">
          {params.success}
        </p>
      )}

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : (
        <section className="card">
          <form action={updateCompetition}>
            <input
              type="hidden"
              name="competition_id"
              value={competition.id}
            />

            <div className="settings-grid">
              <div>
                <label htmlFor="competition-name">
                  Competition name
                </label>

                <input
                  id="competition-name"
                  name="name"
                  type="text"
                  defaultValue={competition.name}
                  required
                />
              </div>

              <div>
                <label htmlFor="entry-cost">Entry cost</label>

                <input
                  id="entry-cost"
                  name="entry_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={competition.entry_cost}
                />
              </div>

              <div>
                <label htmlFor="closing-date">
                  Closing date and time
                </label>

                <input
                  id="closing-date"
                  name="closing_date"
                  type="datetime-local"
                  defaultValue={closingDateValue}
                />
              </div>

              <div>
                <label htmlFor="exact-points">
                  Exact-score points
                </label>

                <input
                  id="exact-points"
                  name="exact_score_points"
                  type="number"
                  min="0"
                  defaultValue={
                    competition.exact_score_points
                  }
                />
              </div>

              <div>
                <label htmlFor="result-points">
                  Correct-result points
                </label>

                <input
                  id="result-points"
                  name="correct_result_points"
                  type="number"
                  min="0"
                  defaultValue={
                    competition.correct_result_points
                  }
                />
              </div>

              <div>
                <label htmlFor="incorrect-points">
                  Incorrect-result points
                </label>

                <input
                  id="incorrect-points"
                  name="incorrect_result_points"
                  type="number"
                  min="0"
                  defaultValue={
                    competition.incorrect_result_points
                  }
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit">Save settings</button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}