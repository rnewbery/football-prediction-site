import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

type Competition = {
  id: number;
  name: string;
  entry_cost: number | null;
  closing_date: string | null;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

type LastManStandingCompetition = {
  id: number;
  name: string;
  closing_date: string | null;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

function formatUkDateTime(value: string | null) {
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

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return `£${Number(value).toFixed(2)}`;
}

function getCompetitionStatus(competition: Competition) {
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

  return "Active";
}

export default async function AdminPage() {
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
          entry_cost,
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

  const { data: lastManStanding, error: lmsError } =
    await supabase
      .from("last_man_standing_competitions")
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
      })
      .limit(1)
      .maybeSingle();

  if (lmsError) {
    console.error(
      "Unable to load Last Man Standing:",
      lmsError.message
    );
  }

  const openCompetition = competitions?.find(
    (competition) => competition.accepting_entries
  );

  const leaderboardCompetition = competitions?.find(
    (competition) => competition.show_on_leaderboard
  );

  const fixtureCounts = await Promise.all(
    (competitions ?? []).map(async (competition) => {
      const { count } = await supabase
        .from("fixtures")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("competition_id", competition.id);

      return {
        competitionId: competition.id,
        count: count ?? 0,
      };
    })
  );

  const fixtureCountMap = new Map(
    fixtureCounts.map((item) => [
      item.competitionId,
      item.count,
    ])
  );

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Portal</p>

          <h1>Competition dashboard</h1>

          <p className="intro">
            Manage competitions, fixtures, results, participant
            entries and Last Man Standing.
          </p>
        </div>

        <div className="admin-header-actions">
          <Link className="button-link secondary" href="/">
            View public website
          </Link>

          <form action={logout}>
            <button
              className="danger-button sign-out-button"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="admin-summary-grid">
        <article className="card admin-summary-card">
          <span>Signed in as</span>
          <strong>{user.email}</strong>
        </article>

        <article className="card admin-summary-card">
          <span>Open for entries</span>
          <strong>
            {openCompetition?.name ?? "No competition open"}
          </strong>
        </article>

        <article className="card admin-summary-card">
          <span>Current leaderboard</span>
          <strong>
            {leaderboardCompetition?.name ??
              "No leaderboard selected"}
          </strong>
        </article>
      </section>

      <section className="card">
        <h2>Competition management</h2>

        {!competitions || competitions.length === 0 ? (
          <p>No active competitions are available.</p>
        ) : (
          <div className="admin-links">
            {competitions.map((competition) => (
              <div
                className="admin-tool-link"
                key={competition.id}
              >
                <strong>{competition.name}</strong>

                <p className="entry-meta">
                  {getCompetitionStatus(competition)}
                </p>

                <div className="competition-details">
                  <div>
                    <span>Entry cost</span>

                    <strong>
                      {formatCurrency(competition.entry_cost)}
                    </strong>
                  </div>

                  <div>
                    <span>Closing date</span>

                    <strong>
                      {formatUkDateTime(
                        competition.closing_date
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Fixtures</span>

                    <strong>
                      {fixtureCountMap.get(competition.id) ?? 0}
                    </strong>
                  </div>

                  <div>
                    <span>Scoring rules</span>

                    <strong>Standard football scoring</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {lastManStanding && (
        <section className="card">
          <h2>Last Man Standing</h2>

          <div className="competition-details">
            <div>
              <span>Competition</span>
              <strong>{lastManStanding.name}</strong>
            </div>

            <div>
              <span>Entries</span>
              <strong>
                {lastManStanding.accepting_entries
                  ? "Open"
                  : "Closed"}
              </strong>
            </div>

            <div>
              <span>Closing date</span>
              <strong>
                {formatUkDateTime(lastManStanding.closing_date)}
              </strong>
            </div>
          </div>

          <div className="form-actions">
            <Link
              className="button-link lms-button"
              href="/admin/last-man-standing"
            >
              Manage Last Man Standing
            </Link>

            <Link
              className="button-link secondary"
              href="/last-man-standing/leaderboard"
            >
              View LMS leaderboard
            </Link>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Main competition tools</h2>

        <p>
          View entries, check the leaderboard, manage fixtures and
          enter results.
        </p>

        <div className="admin-links">
          <Link className="admin-tool-link" href="/admin/entries">
            View participant entries
          </Link>

          <Link className="admin-tool-link" href="/admin/leaderboard">
            View current leaderboard
          </Link>

          <Link className="admin-tool-link" href="/admin/fixtures">
            Manage fixtures and results
          </Link>

          <Link className="admin-tool-link" href="/admin/settings">
            Edit competition settings
          </Link>

          <Link className="admin-tool-link" href="/admin/competitions">
            Create or archive competitions
          </Link>

          <Link
            className="admin-tool-link"
            href="/admin/last-man-standing"
          >
            Last Man Standing
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Print or download sheets</h2>

        <p>
          Print prediction sheets for manual entries. Import fixtures
          is used for bulk fixture imports only.
        </p>

        <div className="admin-links">
          <Link className="admin-tool-link" href="/admin/print-sheets">
            Print prediction sheets
          </Link>

          <Link className="admin-tool-link" href="/admin/fixture-import">
            Import fixtures
          </Link>
        </div>
      </section>

      <section className="card admin-summary-card">
        <h2>API automation tools</h2>

        <p>Ignore — for future automation purposes only.</p>

        <div className="admin-links">
          <Link className="admin-tool-link" href="/admin/fixture-search">
            Search and link API fixtures
          </Link>

          <Link className="admin-tool-link" href="/admin/score-sync">
            Update scores from API
          </Link>
        </div>
      </section>
    </main>
  );
}