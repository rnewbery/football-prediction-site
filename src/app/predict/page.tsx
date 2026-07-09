import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PredictionForm from "./PredictionForm";

export const dynamic = "force-dynamic";

function formatUkDateTime(value: Date | null) {
  if (!value) {
    return "Not recorded";
  }

  return value.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PredictPage() {
  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, name, closing_date, accepting_entries")
      .eq("accepting_entries", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load competition accepting entries:",
      competitionError.message
    );
  }

  const closingDate = competition?.closing_date
    ? new Date(competition.closing_date)
    : null;

  const entriesAreClosed =
    closingDate !== null && closingDate.getTime() <= Date.now();

  const { data: fixtures, error: fixturesError } = competition
    ? await supabase
        .from("fixtures")
        .select(
          "id, fixture_label, kickoff_at, kickoff_sort_key, group_name, home_team, away_team"
        )
        .eq("competition_id", competition.id)
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

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">
            {competition?.name ?? "No competition open"}
          </p>

          <h1>Enter your predictions</h1>

          <p className="intro">
            Enter your name and predicted score for each fixture.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      {!competition ? (
        <section className="card">
          <h2>No competition is currently open</h2>

          <p>
            There is no competition currently accepting entries.
            Please check back when the next competition opens.
          </p>

          <div className="form-actions">
            <Link
              className="button-link secondary"
              href="/leaderboard"
            >
              View current leaderboard
            </Link>
          </div>
        </section>
      ) : entriesAreClosed ? (
        <section className="card">
          <h2>Entries are now closed</h2>

          <p>
            The entry deadline for this competition has passed, so
            new predictions can no longer be submitted.
          </p>

          <div className="competition-details">
            <div>
              <span>Competition</span>
              <strong>{competition.name}</strong>
            </div>

            <div>
              <span>Closed at</span>
              <strong>{formatUkDateTime(closingDate)}</strong>
            </div>
          </div>

          <div className="form-actions">
            <Link
              className="button-link secondary"
              href="/leaderboard"
            >
              View current leaderboard
            </Link>
          </div>
        </section>
      ) : !fixtures || fixtures.length === 0 ? (
        <section className="card">
          <h2>No fixtures added yet</h2>

          <p>
            This competition is open, but no fixtures have been
            added yet.
          </p>
        </section>
      ) : (
        <PredictionForm
          competitionId={competition.id}
          fixtures={fixtures}
        />
      )}
    </main>
  );
}