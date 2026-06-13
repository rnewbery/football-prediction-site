import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  archiveCurrentCompetition,
  createCompetition,
} from "./actions";

type CompetitionsAdminPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompetitionsAdminPage({
  searchParams,
}: CompetitionsAdminPageProps) {
  const resolvedSearchParams = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data: currentCompetition, error: currentError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          entry_cost,
          closing_date,
          access_code
        `
      )
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (currentError) {
    console.error(
      "Unable to load current competition:",
      currentError.message
    );
  }

  const { data: previousCompetitions, error: previousError } =
    await supabase
      .from("competitions")
      .select("id, name, closing_date")
      .eq("is_active", false)
      .order("closing_date", { ascending: false })
      .limit(5);

  if (previousError) {
    console.error(
      "Unable to load previous competitions:",
      previousError.message
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Competitions</h1>

          <p className="intro">
            Archive finished competitions and create new active
            competitions.
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

      <section className="card">
        <h2>Current active competition</h2>

        {!currentCompetition ? (
          <p>No active competition is currently set.</p>
        ) : (
          <>
            <div className="competition-details">
              <div>
                <span>Competition</span>
                <strong>{currentCompetition.name}</strong>
              </div>

              <div>
                <span>Entry cost</span>
                <strong>
                  £
                  {Number(
                    currentCompetition.entry_cost
                  ).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Closing date</span>
                <strong>
                  {currentCompetition.closing_date
                    ? new Date(
                        currentCompetition.closing_date
                      ).toLocaleString("en-GB")
                    : "Not set"}
                </strong>
              </div>
            </div>

            <form
              className="form-actions"
              action={archiveCurrentCompetition}
            >
              <input
                type="hidden"
                name="competition_id"
                value={currentCompetition.id}
              />

              <button className="danger-button" type="submit">
                Archive current competition
              </button>
            </form>

            <p className="input-help">
              Only archive after the final results and scores are
              complete. Archived competitions appear under Previous
              competitions.
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2>Create new competition</h2>

        <form action={createCompetition}>
          <div className="form-grid">
            <div>
              <label htmlFor="name">Competition name</label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="World Cup 2026"
                required
              />
            </div>

            <div>
              <label htmlFor="access_code">Access code</label>

              <input
                id="access_code"
                name="access_code"
                type="text"
                placeholder="GARY2026"
                required
              />
            </div>

            <div>
              <label htmlFor="entry_cost">Entry cost</label>

              <input
                id="entry_cost"
                name="entry_cost"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="closing_date">Closing date</label>

              <input
                id="closing_date"
                name="closing_date"
                type="datetime-local"
                required
              />
            </div>

            <div>
              <label htmlFor="exact_score_points">
                Exact score points
              </label>

              <input
                id="exact_score_points"
                name="exact_score_points"
                type="number"
                defaultValue="3"
                required
              />
            </div>

            <div>
              <label htmlFor="correct_result_points">
                Correct result points
              </label>

              <input
                id="correct_result_points"
                name="correct_result_points"
                type="number"
                defaultValue="1"
                required
              />
            </div>

            <div>
              <label htmlFor="incorrect_result_points">
                Incorrect result points
              </label>

              <input
                id="incorrect_result_points"
                name="incorrect_result_points"
                type="number"
                defaultValue="0"
                required
              />
            </div>

            <div>
              <label htmlFor="first_prize">1st prize</label>

              <input
                id="first_prize"
                name="first_prize"
                type="text"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="second_prize">2nd prize</label>

              <input
                id="second_prize"
                name="second_prize"
                type="text"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="third_prize">3rd prize</label>

              <input
                id="third_prize"
                name="third_prize"
                type="text"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prize_notes">Prize notes</label>

            <textarea
              id="prize_notes"
              name="prize_notes"
              rows={3}
              placeholder="Optional notes about prizes"
            />
          </div>

          <div className="form-actions">
            <button type="submit">Create new competition</button>
          </div>
        </form>

        <p className="input-help">
          Creating a new competition will automatically make any
          existing active competition inactive.
        </p>
      </section>

      <section className="card">
        <h2>Recently archived competitions</h2>

        {!previousCompetitions ||
        previousCompetitions.length === 0 ? (
          <p>No archived competitions yet.</p>
        ) : (
          <div className="admin-links">
            {previousCompetitions.map((competition) => (
              <Link
                className="admin-tool-link"
                href={`/previous-competitions/${competition.id}`}
                key={competition.id}
              >
                {competition.name}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}