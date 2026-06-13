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
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
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

type FixtureSearchClientProps = {
  localFixtures: LocalFixture[];
  initialDateFrom: string;
  initialDateTo: string;
  initialCompetitionFilter: string;
};

function formatApiKickoff(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  });
}

export default function FixtureSearchClient({
  localFixtures,
  initialDateFrom,
  initialDateTo,
  initialCompetitionFilter,
}: FixtureSearchClientProps) {
  const [competition, setCompetition] =
    useState<CompetitionKey>(
      (initialCompetitionFilter as CompetitionKey) ||
        "premier-league-and-world-cup"
    );

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [fixtures, setFixtures] = useState<ApiFixture[]>([]);
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!dateFrom || !dateTo) {
      setMessage("Choose a date from and date to first.");
      return;
    }

    if (dateFrom > dateTo) {
      setMessage("Date from cannot be later than date to.");
      return;
    }

    setIsSearching(true);
    setMessage("");
    setFixtures([]);

    try {
      const parameters = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        competition_filter: competition,
      });

      window.history.replaceState(
        null,
        "",
        `/admin/fixture-search?${parameters.toString()}`
      );

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
              <label htmlFor="fixture-search-date-from">
                Date from
              </label>

              <input
                id="fixture-search-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(event.target.value)
                }
                required
              />
            </div>

            <div>
              <label htmlFor="fixture-search-date-to">
                Date to
              </label>

              <input
                id="fixture-search-date-to"
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(event.target.value)
                }
                required
              />
            </div>

            <button type="submit" disabled={isSearching}>
              {isSearching
                ? "Searching..."
                : "Search fixtures"}
            </button>
          </div>
        </form>

        {message && (
          <p className="form-message">{message}</p>
        )}

        <p className="input-help">
          Search a period rather than a single date, then link
          several API matches without starting again.
        </p>
      </section>

      {fixtures.length > 0 && (
        <section className="fixture-search-results">
          {fixtures.map((result) => {
            const kickoff = formatApiKickoff(
              result.fixture.date
            );

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

                    <strong>{result.fixture.id}</strong>
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

                      <input
                        type="hidden"
                        name="date_from"
                        value={dateFrom}
                      />

                      <input
                        type="hidden"
                        name="date_to"
                        value={dateTo}
                      />

                      <input
                        type="hidden"
                        name="competition_filter"
                        value={competition}
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
                              {fixture.kickoff_at
                                ? `${fixture.kickoff_at} — `
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