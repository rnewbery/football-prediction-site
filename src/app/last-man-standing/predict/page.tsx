import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LastManStandingForm from "../LastManStandingForm";

export const dynamic = "force-dynamic";

type WeekRule = {
  id: number;
  week_name: string;
  required_picks: number;
};

type Fixture = {
  id: number;
  fixture_label: string | null;
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
};

type LastManStandingCompetition = {
  id: number;
  name: string;
  linked_competition_id: number;
  closing_date: string | null;
  linked_competition: {
    name: string;
    accepting_entries: boolean;
    closing_date: string | null;
  } | null;
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

export default async function LastManStandingPredictPage() {
  const { data, error: competitionError } = await supabase
    .from("last_man_standing_competitions")
    .select(
      `
        id,
        name,
        linked_competition_id,
        closing_date,
        linked_competition:competitions!last_man_standing_competitions_linked_competition_id_fkey!inner (
  name,
  accepting_entries,
  closing_date
)
      `
    )
    .eq("is_active", true)
    .eq("linked_competition.accepting_entries", true)
    .order("closing_date", {
      ascending: true,
      nullsFirst: false,
    })
    .limit(1)
    .maybeSingle();

  const competition = data as LastManStandingCompetition | null;

  if (competitionError) {
    console.error(
      "Unable to load Last Man Standing competition:",
      competitionError.message
    );
  }

  const linkedClosingDate = competition?.linked_competition
    ?.closing_date
    ? new Date(competition.linked_competition.closing_date)
    : null;

  const lmsClosingDate = competition?.closing_date
    ? new Date(competition.closing_date)
    : null;

  const closingDate = lmsClosingDate ?? linkedClosingDate;

  const entriesAreClosed =
    closingDate !== null && closingDate.getTime() <= Date.now();

  const { data: weekRules, error: weekRulesError } = competition
    ? await supabase
        .from("last_man_standing_week_rules")
        .select(
          `
            id,
            week_name,
            required_picks
          `
        )
        .eq("lms_competition_id", competition.id)
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (weekRulesError) {
    console.error(
      "Unable to load Last Man Standing week rules:",
      weekRulesError.message
    );
  }

  const { data: fixtures, error: fixturesError } = competition
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
            away_team
          `
        )
        .eq("competition_id", competition.linked_competition_id)
        .order("kickoff_sort_key", {
          ascending: true,
          nullsFirst: false,
        })
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (fixturesError) {
    console.error(
      "Unable to load Last Man Standing fixtures:",
      fixturesError.message
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">
            {competition?.name ?? "Last Man Standing"}
          </p>

          <h1>Enter Last Man Standing predictions</h1>

          <p className="intro">
            Pick the required number of teams to win each week. If
            any of your selected teams fail to win, you are out.
          </p>
        </div>

        <div className="form-actions">
          <Link
            className="button-link secondary"
            href="/last-man-standing"
          >
            Back to Last Man Standing
          </Link>

          <Link className="button-link secondary" href="/">
            Back to homepage
          </Link>
        </div>
      </div>

      {!competition ? (
        <section className="card">
          <h2>No Last Man Standing competition is open</h2>

          <p>
            There is no Last Man Standing game linked to the Premier
            League competition currently accepting entries.
          </p>
        </section>
      ) : entriesAreClosed ? (
        <section className="card">
          <h2>Entries are now closed</h2>

          <p>
            The entry deadline for this Last Man Standing competition
            has passed.
          </p>

          <div className="competition-details">
            <div>
              <span>Last Man Standing</span>
              <strong>{competition.name}</strong>
            </div>

            <div>
              <span>Linked competition</span>
              <strong>
                {competition.linked_competition?.name ??
                  "Not linked"}
              </strong>
            </div>

            <div>
              <span>Closed at</span>
              <strong>
                {formatUkDateTime(closingDate?.toISOString() ?? null)}
              </strong>
            </div>
          </div>

          <div className="form-actions">
            <Link
              className="button-link secondary"
              href="/last-man-standing/leaderboard"
            >
              View Last Man Standing leaderboard
            </Link>
          </div>
        </section>
      ) : !weekRules || weekRules.length === 0 ? (
        <section className="card">
          <h2>No week rules added</h2>

          <p>
            This Last Man Standing competition needs week rules before
            entries can be submitted.
          </p>
        </section>
      ) : !fixtures || fixtures.length === 0 ? (
        <section className="card">
          <h2>No fixtures available</h2>

          <p>
            No fixtures are available for the linked Premier League
            competition yet.
          </p>
        </section>
      ) : (
        <LastManStandingForm
          competitionId={competition.id}
          competitionName={competition.name}
          weekRules={weekRules as WeekRule[]}
          fixtures={fixtures as Fixture[]}
        />
      )}
    </main>
  );
}