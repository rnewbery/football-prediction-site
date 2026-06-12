import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  addFixture,
  deleteFixture,
  updateFixture,
} from "./actions";

type FixturesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function FixturesPage({
  searchParams,
}: FixturesPageProps) {
  const params = await searchParams;
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
    console.error(competitionError.message);
  }

  const { data: fixtures, error: fixturesError } =
    competition
      ? await supabase
          .from("fixtures")
          .select(
            `
              id,
              fixture_label,
              group_name,
              home_team,
              away_team,
              home_score,
              away_score,
              match_status
            `
          )
          .eq("competition_id", competition.id)
          .order("id", { ascending: true })
      : { data: [], error: null };

  if (fixturesError) {
    console.error(fixturesError.message);
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Manage fixtures and results</h1>

          <p className="intro">
            Add fixtures, correct team details and enter the
            actual match results.
          </p>
        </div>

        <Link
          className="button-link secondary"
          href="/admin"
        >
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
        <>
          <section className="card">
            <h2>Add fixture</h2>

            <form action={addFixture}>
              <input
                type="hidden"
                name="competition_id"
                value={competition.id}
              />

              <div className="fixture-form-grid">
                <div>
                  <label htmlFor="new-fixture-label">
                    Date or label
                  </label>

                  <input
                    id="new-fixture-label"
                    name="fixture_label"
                    type="text"
                    placeholder="Thu 11 June"
                  />
                </div>

                <div>
                  <label htmlFor="new-game-number">
                    Game No.
                  </label>

                  <input
                    id="new-game-number"
                    name="game_number"
                    type="text"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label htmlFor="new-home-team">
                    Home team
                  </label>

                  <input
                    id="new-home-team"
                    name="home_team"
                    type="text"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="new-away-team">
                    Away team
                  </label>

                  <input
                    id="new-away-team"
                    name="away_team"
                    type="text"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit">Add fixture</button>
              </div>
            </form>
          </section>

          <section className="card">
            <h2>{competition.name} fixtures</h2>

            {!fixtures || fixtures.length === 0 ? (
              <p>No fixtures have been added yet.</p>
            ) : (
              <div className="admin-fixture-list">
                {fixtures.map((fixture) => (
                  <article
                    className="admin-fixture-card"
                    key={fixture.id}
                  >
                    <form action={updateFixture}>
                      <input
                        type="hidden"
                        name="fixture_id"
                        value={fixture.id}
                      />

                      <input
                        type="hidden"
                        name="competition_id"
                        value={competition.id}
                      />

                      <div className="fixture-edit-grid">
                        <div>
                          <label
                            htmlFor={`fixture-label-${fixture.id}`}
                          >
                            Date or label
                          </label>

                          <input
                            id={`fixture-label-${fixture.id}`}
                            name="fixture_label"
                            type="text"
                            defaultValue={
                              fixture.fixture_label ?? ""
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`game-number-${fixture.id}`}
                          >
                            Game No.
                          </label>

                          <input
                            id={`game-number-${fixture.id}`}
                            name="game_number"
                            type="text"
                            defaultValue={
                              fixture.group_name ?? ""
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`home-team-${fixture.id}`}
                          >
                            Home team
                          </label>

                          <input
                            id={`home-team-${fixture.id}`}
                            name="home_team"
                            type="text"
                            defaultValue={fixture.home_team}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`away-team-${fixture.id}`}
                          >
                            Away team
                          </label>

                          <input
                            id={`away-team-${fixture.id}`}
                            name="away_team"
                            type="text"
                            defaultValue={fixture.away_team}
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`home-score-${fixture.id}`}
                          >
                            Home result
                          </label>

                          <input
                            id={`home-score-${fixture.id}`}
                            name="home_score"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                              fixture.home_score ?? ""
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`away-score-${fixture.id}`}
                          >
                            Away result
                          </label>

                          <input
                            id={`away-score-${fixture.id}`}
                            name="away_score"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                              fixture.away_score ?? ""
                            }
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`status-${fixture.id}`}
                          >
                            Status
                          </label>

                          <select
                            id={`status-${fixture.id}`}
                            name="match_status"
                            defaultValue={
                              fixture.match_status ??
                              "scheduled"
                            }
                          >
                            <option value="scheduled">
                              Scheduled
                            </option>

                            <option value="live">
                              Live
                            </option>

                            <option value="finished">
                              Finished
                            </option>

                            <option value="postponed">
                              Postponed
                            </option>
                          </select>
                        </div>
                      </div>

                      <div className="form-actions">
                        <button type="submit">
                          Save changes
                        </button>
                      </div>
                    </form>

                    <form action={deleteFixture}>
                      <input
                        type="hidden"
                        name="fixture_id"
                        value={fixture.id}
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
                        Delete fixture
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}