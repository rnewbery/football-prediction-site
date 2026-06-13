import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: competition, error } = await supabase
    .from("competitions")
    .select("name, entry_cost, closing_date")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Unable to load competition:", error.message);
  }

  const competitionName =
    competition?.name ?? "No active competition";

  const entryCost = competition
    ? `£${Number(competition.entry_cost).toFixed(2)}`
    : "Not available";

  const closingDate = competition?.closing_date
    ? new Date(competition.closing_date).toLocaleString("en-GB")
    : "To be confirmed";

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Gary&apos;s Football Comps</p>

        <h1>Predict the scores. Follow the leaderboard.</h1>

        <p className="intro">
          Enter your predictions for the current competition and
          check the leaderboard once the results begin.
        </p>

        <div className="actions">
          <Link className="button-link" href="/predict">
            Enter predictions
          </Link>

          <Link
            className="button-link secondary"
            href="/leaderboard"
          >
            View leaderboard
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Current competition</h2>

        <div className="competition-details">
          <div>
            <span>Competition</span>
            <strong>{competitionName}</strong>
          </div>

          <div>
            <span>Entry cost</span>
            <strong>{entryCost}</strong>
          </div>

          <div>
            <span>Closing date</span>
            <strong>{closingDate}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}