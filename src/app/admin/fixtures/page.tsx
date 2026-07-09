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

type Competition = {
  id: number;
  name: string;
  closing_date: string | null;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

type Fixture = {
  id: number;
  competition_id: number;
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-GB");
}

function getCompetitionStatusLabel(competition: Competition) {
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

  return "Active but hidden";
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

  const { data: competitions, error: competitionsError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          closing_date,
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

  const { data: fixtures, error: fixturesError } =
    competitionIds.length > 0
      ? await supabase
          .from("fixtures")
          .select(
            `
              id,
              competition_id,
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
          .in("competition_id", competitionIds)
          .order("competition_id", { ascending: true })
          .order("kickoff_sort_key", {
            ascending: true,
            nullsFirst: false,
          })
          .order("id", { ascending: true })
      : { data: [], error: null };

  if (fixturesError) {
    console.error(
      "Unable to load fixtures:",
      fixturesError.message
    );
  }

  const fixturesByCompetition = new Map<number, Fixture[]>();

  for (const fixture of (fixtures ?? []) as Fixture[]) {
    if (!fixturesByCompetition.has(fixture.competition_id)) {
      fixturesByCompetition.set(fixture.competition_id, []);
    }

    fixturesByCompetition.get(fixture.competition_id)?.push(fixture);
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Manage fixtures and results</h1>

          <p className="intro">
            Add fixtures, enter match results and manage fixture
            details by competition.
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

      {!competitions || competitions.length === 0 ? (
        <section className="card">
          <h2>No active competitions</h2>

          <p>
            No active competitions are available. Create or reopen a
            competition before adding fixtures.
          </p>

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
          const competitionFixtures =
            fixturesByCompetition.get(competition.id) ?? [];

          return (
            <section className="card" key={competition.id}>
              <div className="page-header compact-header">
                <div>
                  <p className="eyebrow">
                    {getCompetitionStatusLabel(competition)}
                  </p>

                  <h2>{competition.name}</h2>

                  <p className="input-help">
                    Closing date:{" "}
                    {formatDate(competition.closing_date)}
                  </p>
                </div>

                <Link
                  className="button-link secondary"
                  href="/admin/competitions"
                >
                  Competition settings
                </Link>
              </div>

              <section className="nested-card">
                <h3>Add fixture to this competition</h3>

                <form action={addFixture}>
                  <input
                    type="hidden"
                    name="competition_id"
                    value={competition.id}
                  />

                  <div className="fixture-form-grid">
                    <div>
                      <label
                        htmlFor={`new-kickoff-at-${competition.id}`}
                      >
                        Kickoff date/time
                      </label>

                      <input
                        id={`new-kickoff-at-${competition.id}`}
                        name="kickoff_at"
                        type="datetime-local"
                        required
                      />

                      <p className="input-help">
                        Choose the fixture date and kickoff time.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`new-home-team-${competition.id}`}
                      >
                        Home team
                      </label>

                      <input
                        id={`new-home-team-${competition.id}`}
                        name="home_team"
                        type="text"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`new-away-team-${competition.id}`}
                      >
                        Away team
                      </label>

                      <input
                        id={`new-away-team-${competition.id}`}
                        name="away_team"
                        type="text"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`new-game-number-${competition.id}`}
                      >
                        Week / group
                      </label>

                      <input
                        id={`new-game-number-${competition.id}`}
                        name="game_number"
                        type="text"
                        placeholder="e.g. Week 1 or A"
                      />

                      <p className="input-help">
                        Optional. Use this for the week or group.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`new-external-fixture-id-${competition.id}`}
                      >
                        API fixture
                      </label>

                      <input
                        id={`new-external-fixture-id-${competition.id}`}
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

              <section className="nested-card">
                <h3>Fixtures and results</h3>

                {competitionFixtures.length === 0 ? (
                  <p>No fixtures have been added for this competition.</p>
                ) : (
                  <div className="admin-fixture-list">
                    {competitionFixtures.map((fixture) => {
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
                                  Choose the fixture date and kickoff
                                  time.
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
                                  Optional. Use this for the week or
                                  group.
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
            </section>
          );
        })
      )}
    </main>
  );
}