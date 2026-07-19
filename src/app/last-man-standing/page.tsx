import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "To be confirmed";
  }

  return new Date(value).toLocaleString("en-GB");
}

export default async function LastManStandingHomePage() {
  const { data: openCompetition, error: openError } =
    await supabase
      .from("last_man_standing_competitions")
      .select("name, closing_date, accepting_entries")
      .eq("is_active", true)
      .eq("accepting_entries", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      })
      .limit(1)
      .maybeSingle();

  if (openError) {
    console.error(
      "Unable to load open Last Man Standing competition:",
      openError.message
    );
  }

  const { data: leaderboardCompetition, error: leaderboardError } =
    await supabase
      .from("last_man_standing_competitions")
      .select("name, closing_date, show_on_leaderboard")
      .eq("is_active", true)
      .eq("show_on_leaderboard", true)
      .limit(1)
      .maybeSingle();

  if (leaderboardError) {
    console.error(
      "Unable to load Last Man Standing leaderboard competition:",
      leaderboardError.message
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Gary&apos;s Football Comps</p>

          <h1>Last Man Standing</h1>

          <p className="intro">
            Pick the required number of teams to win each week. If any
            of your selected teams fail to win, you are out. You also
            cannot choose the same team more than once.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      <section className="card current-competition-card">
        <h2>Last Man Standing competition</h2>

        <div className="competition-details">
          <div>
            <span>Open for entries</span>
            <strong>
              {openCompetition?.name ?? "No competition open"}
            </strong>
          </div>

          <div>
            <span>Entry status</span>
            <strong>
              {openCompetition ? "Open" : "Closed"}
            </strong>
          </div>

          <div>
            <span>Closing date</span>
            <strong>
              {formatDate(openCompetition?.closing_date)}
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

        <p className="form-message">
          The entry page shows the Last Man Standing competition
          currently open for predictions. The leaderboard shows the
          Last Man Standing competition currently being scored.
        </p>

        <div className="form-actions">
          <Link
            className="button-link lms-button"
            href="/last-man-standing/predict"
          >
            Enter predictions
          </Link>

          <Link
            className="button-link secondary"
            href="/last-man-standing/leaderboard"
          >
            View leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}