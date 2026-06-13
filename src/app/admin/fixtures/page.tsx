import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  addFixture,
  deleteFixture,
  unlinkApiFixture,
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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
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
              kickoff_at,
              kickoff_sort_key,
              group_name,
              home_team,
              away_team,
              home_score,
              away_score,
              match_status,
              status,
              external_fixture_id
            `
          )
          .eq("competition_id", competition.id)
          .order("kickoff_sort_key", {
            ascending: true,
            nullsFirst: false,
          })
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
            Add fixtures, correct team details, enter match results
            and manage API-Football fixture links.
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
                  <label htmlFor="new-kickoff-at">
                    Kickoff date/time
                  </label>

                  <input
                    id="new-kickoff-at"
                    name="kickoff_at"
                    type="text"
                    placeholder="11 Jun 2026 20:00"
                    required
                  />

                  <p className="input-help">
                    Use this format: 11 Jun 2026 20:00
                  </p>
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
                    required
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

                <div>
                  <label htmlFor="new-external-fixture-id">
                    API fixture ID optional
                  </label>

                  <input
                    id="new-external-fixture-id"
                    name="external_fixture_id"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 66456904"
                  />

                  <p className="input-help">
                    Leave blank if this fixture is not linked to
                    API-Football.
                  </p>
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
                {fixtures.map((fixture) => {
                  const displayStatus =
                    fixture.status ??
                    fixture.match_status ??
                    "scheduled";

                  return (
                    <article
                      className="admin-fixture-card"
                      key={fixture.id}
                    >
                      <div className="form-message">
                        API fixture ID:{" "}
                        <strong>
                          {fixture.external_fixture_id ??
                            "Not linked"}
                        </strong>

                        {fixture.external_fixture_id && (
                          <form action={unlinkApiFixture}>
                            <input
                              type="hidden"
                              name="fixture_id"
                              value={fixture.id}
                            />

                            <button
                              className="secondary-button"
                              type="submit"
                            >
                              Unlink API fixture
                            </button>
                          </form>
                        )}
                      </div>

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
                              htmlFor={`kickoff-at-${fixture.id}`}
                            >
                              Kickoff date/time
                            </label>

                            <input
                              id={`kickoff-at-${fixture.id}`}
                              name="kickoff_at"
                              type="text"
                              defaultValue={
                                fixture.kickoff_at ??
                                fixture.fixture_label ??
                                ""
                              }
                              placeholder="11 Jun 2026 20:00"
                              required
                            />

                            <p className="input-help">
                              Use this format: 11 Jun 2026 20:00
                            </p>
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
                              required
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
                              htmlFor={`external-fixture-id-${fixture.id}`}
                            >
                              API fixture ID optional
                            </label>

                            <input
                              id={`external-fixture-id-${fixture.id}`}
                              name="external_fixture_id"
                              type="number"
                              min="1"
                              step="1"
                              defaultValue={
                                fixture.external_fixture_id ?? ""
                              }
                              placeholder="e.g. 66456904"
                            />

                            <p className="input-help">
                              Paste the API-Football fixture ID
                              here, or leave blank if unlinked.
                            </p>
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
                              defaultValue={displayStatus}
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
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}