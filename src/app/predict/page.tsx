import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PredictionForm from "./PredictionForm";

export default async function PredictPage() {
  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, name, closing_date")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load competition:",
      competitionError.message
    );
  }

  const { data: fixtures, error: fixturesError } = competition
    ? await supabase
        .from("fixtures")
        .select(
          "id, fixture_label, group_name, home_team, away_team"
        )
        .eq("competition_id", competition.id)
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
            {competition?.name ?? "Current competition"}
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
          <p>No active competition is available.</p>
        </section>
      ) : !fixtures || fixtures.length === 0 ? (
        <section className="card">
          <p>No fixtures have been added yet.</p>
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