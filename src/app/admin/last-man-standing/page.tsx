import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  archiveLastManStandingCompetition,
  createLastManStandingCompetition,
  deleteLastManStandingEntry,
} from "./actions";

export const dynamic = "force-dynamic";

type ScoreCompetition = {
  id: number;
  name: string;
  closing_date: string | null;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

type LastManStandingCompetition = {
  id: number;
  name: string;
  linked_competition_id: number;
  access_code: string;
  closing_date: string | null;
  linked_competition: {
    name: string;
    accepting_entries: boolean;
    show_on_leaderboard: boolean;
    closing_date: string | null;
  } | null;
};

type WeekRule = {
  id: number;
  lms_competition_id: number;
  week_name: string;
  required_picks: number;
};

type Entry = {
  id: number;
  lms_competition_id: number;
  participant_name: string;
  participant_email: string | null;
  submitted_at: string;
  picks: {
    id: number;
    selected_team: string;
    fixture: {
      group_name: string | null;
      home_team: string;
      away_team: string;
      home_score: number | null;
      away_score: number | null;
    } | null;
  }[];
};

type AdminLastManStandingPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "To be confirmed";
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

function getPickStatus(
  selectedTeam: string,
  fixture: Entry["picks"][number]["fixture"]
) {
  if (!fixture) {
    return "Fixture unavailable";
  }

  if (fixture.home_score === null || fixture.away_score === null) {
    return "Pending";
  }

  const selected = selectedTeam.trim().toLowerCase();
  const home = fixture.home_team.trim().toLowerCase();
  const away = fixture.away_team.trim().toLowerCase();

  if (selected === home && fixture.home_score > fixture.away_score) {
    return "Win";
  }

  if (selected === away && fixture.away_score > fixture.home_score) {
    return "Win";
  }

  return "Loss";
}

function getEntryStatus(entry: Entry) {
  const statuses = entry.picks.map((pick) =>
    getPickStatus(pick.selected_team, pick.fixture)
  );

  if (statuses.includes("Loss")) {
    return "Out";
  }

  return "Still in";
}

function groupPicksByWeek(entry: Entry) {
  const weekMap = new Map<string, string[]>();

  for (const pick of entry.picks) {
    const weekName = pick.fixture?.group_name ?? "No week";

    if (!weekMap.has(weekName)) {
      weekMap.set(weekName, []);
    }

    weekMap.get(weekName)?.push(pick.selected_team);
  }

  return Array.from(weekMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

export default async function AdminLastManStandingPage({
  searchParams,
}: AdminLastManStandingPageProps) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data: scoreCompetitions, error: scoreCompetitionsError } =
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

  if (scoreCompetitionsError) {
    console.error(
      "Unable to load score competitions:",
      scoreCompetitionsError.message
    );
  }

  const { data: competitions, error: competitionsError } =
    await supabase
      .from("last_man_standing_competitions")
      .select(
        `
          id,
          name,
          linked_competition_id,
          access_code,
          closing_date,
          linked_competition:competitions!last_man_standing_competitions_linked_competition_id_fkey (
            name,
            accepting_entries,
            show_on_leaderboard,
            closing_date
          )
        `
      )
      .eq("is_active", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      });

  if (competitionsError) {
    console.error(
      "Unable to load Last Man Standing games:",
      competitionsError.message
    );
  }

  const lmsCompetitionIds = (competitions ?? []).map(
    (competition) => competition.id
  );

  const { data: weekRules, error: weekRulesError } =
    lmsCompetitionIds.length > 0
      ? await supabase
          .from("last_man_standing_week_rules")
          .select(
            `
              id,
              lms_competition_id,
              week_name,
              required_picks
            `
          )
          .in("lms_competition_id", lmsCompetitionIds)
          .order("id", { ascending: true })
      : { data: [], error: null };

  if (weekRulesError) {
    console.error(
      "Unable to load Last Man Standing week rules:",
      weekRulesError.message
    );
  }

  const { data: entries, error: entriesError } =
    lmsCompetitionIds.length > 0
      ? await supabase
          .from("last_man_standing_entries")
          .select(
            `
              id,
              lms_competition_id,
              participant_name,
              participant_email,
              submitted_at,
              picks:last_man_standing_picks (
                id,
                selected_team,
                fixture:fixtures!last_man_standing_picks_fixture_id_fkey (
                  group_name,
                  home_team,
                  away_team,
                  home_score,
                  away_score
                )
              )
            `
          )
          .in("lms_competition_id", lmsCompetitionIds)
          .order("submitted_at", { ascending: false })
      : { data: [], error: null };

  if (entriesError) {
    console.error(
      "Unable to load Last Man Standing entries:",
      entriesError.message
    );
  }

  const typedScoreCompetitions =
    (scoreCompetitions ?? []) as ScoreCompetition[];

  const typedCompetitions =
    (competitions ?? []) as LastManStandingCompetition[];

  const typedWeekRules = (weekRules ?? []) as WeekRule[];
  const typedEntries = (entries ?? []) as unknown as Entry[];

  const linkedCompetitionIds = new Set(
    typedCompetitions.map(
      (competition) => competition.linked_competition_id
    )
  );

  const scoreCompetitionsWithoutLms =
    typedScoreCompetitions.filter(
      (competition) => !linkedCompetitionIds.has(competition.id)
    );

  const openLinkedLmsCompetition = typedCompetitions.find(
    (competition) =>
      competition.linked_competition?.accepting_entries
  );

  const leaderboardLinkedLmsCompetition = typedCompetitions.find(
    (competition) =>
      competition.linked_competition?.show_on_leaderboard
  );

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Last Man Standing</h1>

          <p className="intro">
            Add LMS games to Premier League competitions and manage
            submitted entries.
          </p>
        </div>

        <div className="form-actions">
          <Link className="button-link secondary" href="/admin">
            Back to dashboard
          </Link>

          <Link
            className="button-link secondary"
            href="/last-man-standing/leaderboard"
          >
            Public leaderboard
          </Link>
        </div>
      </div>

      {params?.success && (
        <section className="success-message">
          {params.success}
        </section>
      )}

      {params?.error && (
        <section className="error-message">{params.error}</section>
      )}

      <section className="admin-summary-grid">
        <article className="card admin-summary-card">
          <span>Open LMS</span>
          <strong>
            {openLinkedLmsCompetition?.name ?? "None"}
          </strong>
        </article>

        <article className="card admin-summary-card">
          <span>Leaderboard LMS</span>
          <strong>
            {leaderboardLinkedLmsCompetition?.name ?? "None"}
          </strong>
        </article>

        <article className="card admin-summary-card">
          <span>LMS games</span>
          <strong>{typedCompetitions.length}</strong>
        </article>

        <article className="card admin-summary-card">
          <span>Total entries</span>
          <strong>{typedEntries.length}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Add LMS game</h2>

        {scoreCompetitionsWithoutLms.length === 0 ? (
          <p>No available Premier League competitions need LMS added.</p>
        ) : (
          <form
            className="settings-form"
            action={createLastManStandingCompetition}
          >
            <label>
              Premier League competition
              <select name="linked_competition_id" required>
                <option value="">Choose competition</option>

                {scoreCompetitionsWithoutLms.map((competition) => (
                  <option
                    key={competition.id}
                    value={competition.id}
                  >
                    {competition.name}
                    {competition.accepting_entries
                      ? " — open"
                      : ""}
                    {competition.show_on_leaderboard
                      ? " — leaderboard"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              LMS name
              <input
                name="name"
                type="text"
                placeholder="Last Man Standing"
                required
              />
            </label>

            <button className="button-link lms-button" type="submit">
              Add LMS
            </button>
          </form>
        )}
      </section>

      {typedCompetitions.length === 0 ? (
        <section className="card">
          <h2>No LMS games</h2>

          <p>No Last Man Standing games have been added yet.</p>
        </section>
      ) : (
        typedCompetitions.map((competition) => {
          const competitionWeekRules = typedWeekRules.filter(
            (rule) => rule.lms_competition_id === competition.id
          );

          const competitionEntries = typedEntries.filter(
            (entry) =>
              entry.lms_competition_id === competition.id
          );

          const stillInCount = competitionEntries.filter(
            (entry) => getEntryStatus(entry) === "Still in"
          ).length;

          const outCount = competitionEntries.length - stillInCount;

          return (
            <section className="card" key={competition.id}>
              <div className="entry-header">
                <div>
                  <h2>{competition.name}</h2>

                  <p className="entry-meta">
                    Linked to{" "}
                    {competition.linked_competition?.name ??
                      "unknown competition"}
                  </p>
                </div>

                <div className="entry-score-summary">
                  <div>
                    <span>Entries</span>
                    <strong>{competitionEntries.length}</strong>
                  </div>

                  <div>
                    <span>Still in</span>
                    <strong>{stillInCount}</strong>
                  </div>

                  <div>
                    <span>Out</span>
                    <strong>{outCount}</strong>
                  </div>
                </div>
              </div>

              <div className="competition-details">
                <div>
                  <span>Entries</span>
                  <strong>
                    {competition.linked_competition?.accepting_entries
                      ? "Open"
                      : "Closed"}
                  </strong>
                </div>

                <div>
                  <span>Leaderboard</span>
                  <strong>
                    {competition.linked_competition
                      ?.show_on_leaderboard
                      ? "Shown"
                      : "Hidden"}
                  </strong>
                </div>

                <div>
                  <span>Code</span>
                  <strong>{competition.access_code}</strong>
                </div>

                <div>
                  <span>Closing date</span>
                  <strong>
                    {formatDate(
                      competition.linked_competition?.closing_date ??
                        competition.closing_date
                    )}
                  </strong>
                </div>
              </div>

              <div className="entry-action-row">
                <form action={archiveLastManStandingCompetition}>
                  <input
                    type="hidden"
                    name="competition_id"
                    value={competition.id}
                  />

                  <button
                    className="danger-button"
                    type="submit"
                  >
                    Archive LMS
                  </button>
                </form>
              </div>

              <h3>Rules</h3>

              {competitionWeekRules.length === 0 ? (
                <p>No rules added.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="entries-table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Picks</th>
                      </tr>
                    </thead>

                    <tbody>
                      {competitionWeekRules.map((rule) => (
                        <tr key={rule.id}>
                          <td>{rule.week_name}</td>
                          <td>{rule.required_picks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3>Entries</h3>

              {competitionEntries.length === 0 ? (
                <p>No entries yet.</p>
              ) : (
                <div className="entries-list">
                  {competitionEntries.map((entry) => {
                    const status = getEntryStatus(entry);
                    const groupedPicks = groupPicksByWeek(entry);

                    return (
                      <article
                        className="card entry-card"
                        key={entry.id}
                      >
                        <div className="entry-header">
                          <div>
                            <h3>{entry.participant_name}</h3>

                            <p className="entry-meta">
                              Ref: {entry.id}
                            </p>

                            <p className="entry-meta">
                              Email:{" "}
                              {entry.participant_email ??
                                "Not provided"}
                            </p>

                            <p className="entry-meta">
                              Submitted:{" "}
                              {formatDate(entry.submitted_at)}
                            </p>
                          </div>

                          <div className="entry-score-summary">
                            <div>
                              <span>Status</span>
                              <strong>{status}</strong>
                            </div>

                            <div>
                              <span>Picks</span>
                              <strong>{entry.picks.length}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="entry-action-row">
                          <form action={deleteLastManStandingEntry}>
                            <input
                              type="hidden"
                              name="entry_id"
                              value={entry.id}
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
                                <th>Week</th>
                                <th>Selected teams</th>
                              </tr>
                            </thead>

                            <tbody>
                              {groupedPicks.map(
                                ([weekName, selectedTeams]) => (
                                  <tr key={weekName}>
                                    <td>{weekName}</td>
                                    <td>
                                      {selectedTeams.join(", ")}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}