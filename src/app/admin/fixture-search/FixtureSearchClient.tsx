"use client";

import { FormEvent, useState } from "react";
import { linkApiFixture } from "./actions";

type CompetitionKey =
  | "premier-league-and-world-cup"
  | "world-cup"
  | "premier-league"
  | "all";

type LocalFixture = {
  id: number;
  fixture_label: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  external_fixture_id: number | null;
};

type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    timezone: string;
    venue: {
      name: string | null;
      city: string | null;
    } | null;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    round: string;
    logo: string | null;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

type FixtureApiResponse = {
  errors?: Record<string, string> | string[];
  results?: number;
  totalResultsBeforeFiltering?: number;
  response?: ApiFixture[];
};

export default function FixtureSearchClient({
  localFixtures,
}: {
  localFixtures: LocalFixture[];
}) {
  const [competition, setCompetition] =
    useState<CompetitionKey>(
      "premier-league-and-world-cup"
    );

  const [date, setDate] = useState("");
  const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!date) {
      setMessage("Choose a date first.");
      return;
    }

    setIsSearching(true);
    setMessage("");
    setFixtures([]);

    try {
      const parameters = new URLSearchParams({
        date,
        competition,
      });

      const response = await fetch(
        `/api/football-fixtures?${parameters.toString()}`
      );

      const data: FixtureApiResponse = await response.json();

      if (!response.ok) {
        setMessage(
          "The fixture search could not be completed."
        );
        return;
      }

      const returnedFixtures = data.response ?? [];

      setFixtures(returnedFixtures);

      if (returnedFixtures.length === 0) {
        setMessage(
          `No matching fixtures found. API returned ${
            data.totalResultsBeforeFiltering ?? 0
          } total fixtures before filtering.`
        );
      } else {
        setMessage(
          `${returnedFixtures.length} matching fixtures found.`
        );
      }
    } catch (error) {
      console.error("Fixture search failed:", error);

      setMessage(
        "The fixture search could not be completed."
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <>
      <section className="card">
        <form onSubmit={handleSearch}>
          <div className="fixture-search-controls">
            <div>
              <label htmlFor="fixture-competition">
                Competition
              </label>

              <select
                id="fixture-competition"
                value={competition}
                onChange={(event) =>
                  setCompetition(
                    event.target.value as CompetitionKey
                  )
                }
              >
                <option value="premier-league-and-world-cup">
                  Premier League + World Cup
                </option>

                <option value="world-cup">
                  World Cup only
                </option>

                <option value="premier-league">
                  Premier League only
                </option>

                <option value="all">
                  All competitions
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="fixture-search-date">
                Match date
              </label>

              <input
                id="fixture-search-date"
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
            >
              {isSearching
                ? "Searching..."
                : "Search fixtures"}
            </button>
          </div>
        </form>

        {message && (
          <p className="form-message">{message}</p>
        )}
      </section>

      {fixtures.length > 0 && (
        <section className="fixture-search-results">
          {fixtures.map((result) => {
            const kickoff = new Date(
              result.fixture.date
            ).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/London",
            });

            const hasScore =
              result.goals.home !== null &&
              result.goals.away !== null;

            const alreadyLinkedFixture =
              localFixtures.find(
                (fixture) =>
                  fixture.external_fixture_id ===
                  result.fixture.id
              );

            return (
              <article
                className="card api-fixture-card"
                key={result.fixture.id}
              >
                <div className="api-fixture-heading">
                  <div>
                    <p className="api-league-name">
                      {result.league.name}
                    </p>

                    <p className="entry-meta">
                      {result.league.country}

                      {result.league.round
                        ? ` · ${result.league.round}`
                        : ""}
                    </p>
                  </div>

                  <div className="api-fixture-id">
                    <span>Fixture ID</span>

                    <strong>
                      {result.fixture.id}
                    </strong>
                  </div>
                </div>

                <div className="api-match-row">
                  <div className="api-team">
                    {result.teams.home.logo && (
                      <img
                        src={result.teams.home.logo}
                        alt=""
                        width={34}
                        height={34}
                      />
                    )}

                    <strong>
                      {result.teams.home.name}
                    </strong>
                  </div>

                  <div className="api-score">
                    {hasScore
                      ? `${result.goals.home} - ${result.goals.away}`
                      : "v"}
                  </div>

                  <div className="api-team api-away-team">
                    <strong>
                      {result.teams.away.name}
                    </strong>

                    {result.teams.away.logo && (
                      <img
                        src={result.teams.away.logo}
                        alt=""
                        width={34}
                        height={34}
                      />
                    )}
                  </div>
                </div>

                <div className="api-fixture-details">
                  <span>{kickoff}</span>

                  <span>
                    {result.fixture.status.long}
                  </span>

                  <span>
                    {result.fixture.venue?.name ??
                      "Venue not listed"}
                  </span>
                </div>

                <div className="api-link-panel">
                  {alreadyLinkedFixture ? (
                    <p className="form-message">
                      Already linked to:{" "}
                      {alreadyLinkedFixture.group_name
                        ? `Game ${alreadyLinkedFixture.group_name}: `
                        : ""}
                      {alreadyLinkedFixture.home_team} v{" "}
                      {alreadyLinkedFixture.away_team}
                    </p>
                  ) : (
                    <form action={linkApiFixture}>
                      <input
                        type="hidden"
                        name="external_fixture_id"
                        value={result.fixture.id}
                      />

                      <label
                        htmlFor={`local-fixture-${result.fixture.id}`}
                      >
                        Link this API match to your fixture
                      </label>

                      <div className="api-link-controls">
                        <select
                          id={`local-fixture-${result.fixture.id}`}
                          name="local_fixture_id"
                          required
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Choose your fixture
                          </option>

                          {localFixtures.map((fixture) => (
                            <option
                              key={fixture.id}
                              value={fixture.id}
                            >
                              {fixture.group_name
                                ? `Game ${fixture.group_name}: `
                                : ""}
                              {fixture.home_team} v{" "}
                              {fixture.away_team}
                              {fixture.external_fixture_id
                                ? ` — linked to ${fixture.external_fixture_id}`
                                : ""}
                            </option>
                          ))}
                        </select>

                        <button type="submit">
                          Link fixture
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}