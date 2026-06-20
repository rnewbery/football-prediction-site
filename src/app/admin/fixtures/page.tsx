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

type Fixture = {
  id: number;
  fixture_label: string | null;
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_status: string | null;
  status: string | null;
  external_fixture_id: number | null;
};

function formatKickoffForInput(fixture: Fixture) {
  if (fixture.kickoff_sort_key) {
    return fixture.kickoff_sort_key.replace(" ", "T").slice(0, 16);
  }

  return "";
}

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
            Add fixtures, enter match results and manage fixture
            details.
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
                    type="datetime-local"
                    required
                  />

                  <p className="input-help">
                    Choose the fixture date and kickoff time.
                  </p>
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
                  <label htmlFor="new-game-number">
                    Week / group
                  </label>

                  <input
                    id="new-game-number"
                    name="game_number"
                    type="text"
                    placeholder="e.g. Week 1 or A"
                  />

                  <p className="input-help">
                    Optional. Use this for the week or group.
                  </p>
                </div>

                <div>
                  <label htmlFor="new-external-fixture-id">
                    API fixture
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
                    Optional. Leave blank if not linked.
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
                {(fixtures as Fixture[]).map((fixture) => {
                  const displayStatus =
                    fixture.status ??
                    fixture.match_status ??
                    "scheduled";

                  return (
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
                              htmlFor={`kickoff-at-${fixture.id}`}
                            >
                              Kickoff date/time
                            </label>

                            <input
                              id={`kickoff-at-${fixture.id}`}
                              name="kickoff_at"
                              type="datetime-local"
                              defaultValue={formatKickoffForInput(
                                fixture
                              )}
                              required
                            />

                            <p className="input-help">
                              Choose the fixture date and kickoff time.
                            </p>
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
                              Home score
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
                              Away score
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

                              <option value="finished">
                                Finished
                              </option>

                              <option value="postponed">
                                Postponed
                              </option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`game-number-${fixture.id}`}
                            >
                              Week / group
                            </label>

                            <input
                              id={`game-number-${fixture.id}`}
                              name="game_number"
                              type="text"
                              defaultValue={
                                fixture.group_name ?? ""
                              }
                              placeholder="e.g. Week 1 or A"
                            />

                            <p className="input-help">
                              Optional. Use this for the week or group.
                            </p>
                          </div>

                          <div>
                            <label
                              htmlFor={`external-fixture-id-${fixture.id}`}
                            >
                              API fixture
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
                              {fixture.external_fixture_id
                                ? `Linked: ${fixture.external_fixture_id}`
                                : "Not linked"}
                            </p>
                          </div>
                        </div>

                        <div className="form-actions">
                          <button type="submit">
                            Save changes
                          </button>
                        </div>
                      </form>

                      <div className="form-actions">
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
                      </div>
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