import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logout } from "./actions";

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

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          entry_cost,
          closing_date
        `
      )
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load competition:",
      competitionError.message
    );
  }

  const { count: fixtureCount } = competition
    ? await supabase
        .from("fixtures")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("competition_id", competition.id)
    : { count: 0 };

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Portal</p>

          <h1>Competition dashboard</h1>

          <p className="intro">
            Manage the current competition, fixtures, results and
            participant entries.
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
          <span>Current competition</span>
          <strong>
            {competition?.name ?? "No active competition"}
          </strong>
        </article>

        <article className="card admin-summary-card">
          <span>Fixtures</span>
          <strong>{fixtureCount ?? 0}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Competition management</h2>

        {!competition ? (
          <p>No active competition is available.</p>
        ) : (
          <div className="competition-details">
            <div>
              <span>Entry cost</span>

              <strong>
                £{Number(competition.entry_cost).toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Closing date</span>

              <strong>
                {formatUkDateTime(competition.closing_date)}
              </strong>
            </div>

            <div>
              <span>Scoring rules</span>

              <strong>Standard football scoring</strong>
            </div>
          </div>
        )}
      </section>

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