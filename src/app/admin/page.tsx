import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logout } from "./actions";

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
          closing_date,
          exact_score_points,
          correct_result_points,
          incorrect_result_points
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
          <p className="eyebrow">Administrator area</p>

          <h1>Competition dashboard</h1>

          <p className="intro">
            Manage the current competition, fixtures, results,
            participant entries and payment approvals.
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
                {competition.closing_date
                  ? new Date(
                      competition.closing_date
                    ).toLocaleString("en-GB")
                  : "To be confirmed"}
              </strong>
            </div>

            <div>
              <span>Scoring</span>

              <strong>
                Exact {competition.exact_score_points} / Result{" "}
                {competition.correct_result_points}
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="card">
  <h2>Admin tools</h2>

  <div className="admin-links">
    <Link className="admin-tool-link" href="/admin/entries">
      View and approve participant entries
    </Link>

    <Link className="admin-tool-link" href="/admin/leaderboard">
      View current leaderboard
    </Link>

    <Link className="admin-tool-link" href="/admin/fixtures">
      Manage fixtures and results
    </Link>

    <Link className="admin-tool-link" href="/admin/score-sync">
      Update scores from API
    </Link>

    <Link className="admin-tool-link" href="/admin/fixture-search">
      Search and link API fixtures
    </Link>

    <Link className="admin-tool-link" href="/admin/settings">
      Edit competition settings
    </Link>

    <Link className="admin-tool-link" href="/admin/competitions">
      Create or archive competitions
    </Link>

    <Link className="admin-tool-link" href="/admin/fixture-import">
      Import fixtures from CSV
    </Link>
  </div>
</section>
    </main>
  );
}