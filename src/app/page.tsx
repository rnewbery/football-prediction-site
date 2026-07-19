import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return `£${Number(value).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "To be confirmed";
  }

  return new Date(value).toLocaleString("en-GB");
}

export default async function Home() {
  const { data: scoreCompetition, error: scoreError } =
    await supabase
      .from("competitions")
      .select("name, entry_cost, closing_date")
      .eq("accepting_entries", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();

  if (scoreError) {
    console.error(
      "Unable to load score competition:",
      scoreError.message
    );
  }

  const { data: leaderboardCompetition, error: leaderboardError } =
    await supabase
      .from("competitions")
      .select("name")
      .eq("show_on_leaderboard", true)
      .limit(1)
      .maybeSingle();

  if (leaderboardError) {
    console.error(
      "Unable to load leaderboard competition:",
      leaderboardError.message
    );
  }

  const { data: lastManStanding, error: lmsError } =
    await supabase
      .from("last_man_standing_competitions")
      .select("name, closing_date")
      .eq("accepting_entries", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();

  if (lmsError) {
    console.error(
      "Unable to load Last Man Standing competition:",
      lmsError.message
    );
  }

  return (
    <main>
      <div className="public-top-bar">
        <Link className="admin-portal-link" href="/admin">
          Admin Portal
        </Link>
      </div>

      <section className="hero">
        <p className="eyebrow">Gary&apos;s Football Comps</p>

        <h1>Predict the scores & follow the leaderboard.</h1>

        <p className="intro">
          Enter your predictions and follow
          the current leaderboards once results come in.
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

  <Link
    className="button-link lms-button"
    href="/last-man-standing"
  >
    Last Man Standing
  </Link>

  <Link
    className="button-link secondary"
    href="/previous-competitions"
  >
    Previous competitions
  </Link>
</div>
      </section>

      <section className="card current-competition-card">
        <h2>Score prediction competition</h2>

        <div className="competition-details">
          <div>
            <span>Open for entries</span>
            <strong>
              {scoreCompetition?.name ?? "No competition open"}
            </strong>
          </div>

          <div>
            <span>Entry cost</span>
            <strong>
              {formatCurrency(scoreCompetition?.entry_cost)}
            </strong>
          </div>

          <div>
            <span>Closing date</span>
            <strong>
              {formatDate(scoreCompetition?.closing_date)}
            </strong>
          </div>

          <div>
            <span>Current leaderboard</span>
            <strong>
              {leaderboardCompetition?.name ??
                "No leaderboard selected"}
            </strong>
          </div>
        </div>
      </section>

      <section className="card current-competition-card">
        <h2>Last Man Standing</h2>

        <div className="competition-details">
          <div>
            <span>Open for entries</span>
            <strong>
              {lastManStanding?.name ?? "No competition open"}
            </strong>
          </div>

          <div>
            <span>Closing date</span>
            <strong>
              {formatDate(lastManStanding?.closing_date)}
            </strong>
          </div>
        </div>
      </section>
    </main>
  );
}