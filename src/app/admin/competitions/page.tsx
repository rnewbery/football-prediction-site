import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  archiveCurrentCompetition,
  closeCompetitionEntries,
  createCompetition,
  deleteArchivedCompetition,
  hideCompetitionLeaderboard,
  setCompetitionAcceptingEntries,
  setCompetitionLeaderboard,
} from "./actions";

type CompetitionsAdminPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type Competition = {
  id: number;
  name: string;
  entry_cost: number | null;
  closing_date: string | null;
  access_code: string | null;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString("en-GB");
}

function renderCompetitionCard(competition: Competition) {
  return (
    <div className="admin-tool-link" key={competition.id}>
      <strong>{competition.name}</strong>

      <div className="competition-details">
        <div>
          <span>Entry cost</span>
          <strong>
            £{Number(competition.entry_cost ?? 0).toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Closing date</span>
          <strong>{formatDate(competition.closing_date)}</strong>
        </div>

        <div>
          <span>Access code</span>
          <strong>{competition.access_code ?? "Not set"}</strong>
        </div>

        <div>
          <span>Entries</span>
          <strong>
            {competition.accepting_entries ? "Open" : "Closed"}
          </strong>
        </div>

        <div>
          <span>Leaderboard</span>
          <strong>
            {competition.show_on_leaderboard
              ? "Current"
              : "Not current"}
          </strong>
        </div>
      </div>

      <p className="input-help">
        {competition.accepting_entries &&
        competition.show_on_leaderboard
          ? "This competition is open for entries and is also the current public leaderboard."
          : competition.accepting_entries
          ? "This competition is open for predictions on the public prediction page."
          : competition.show_on_leaderboard
          ? "This competition is the current public leaderboard while results are being entered."
          : "This competition is active, but not currently open for entries or shown on the public leaderboard."}
      </p>

      <div className="form-actions">
        {!competition.accepting_entries ? (
          <form action={setCompetitionAcceptingEntries}>
            <input
              type="hidden"
              name="competition_id"
              value={competition.id}
            />

            <button type="submit">Open for entries</button>
          </form>
        ) : (
          <form action={closeCompetitionEntries}>
            <input
              type="hidden"
              name="competition_id"
              value={competition.id}
            />

            <button className="secondary-button" type="submit">
              Close entries
            </button>
          </form>
        )}

        {!competition.show_on_leaderboard ? (
          <form action={setCompetitionLeaderboard}>
            <input
              type="hidden"
              name="competition_id"
              value={competition.id}
            />

            <button type="submit">
              Set as current leaderboard
            </button>
          </form>
        ) : (
          <form action={hideCompetitionLeaderboard}>
            <input
              type="hidden"
              name="competition_id"
              value={competition.id}
            />

            <button className="secondary-button" type="submit">
              Hide leaderboard
            </button>
          </form>
        )}

        <Link
          className="button-link secondary"
          href="/admin/fixtures"
        >
          Manage fixtures
        </Link>

        <Link
          className="button-link secondary"
          href="/admin/entries"
        >
          View entries
        </Link>

        <form action={archiveCurrentCompetition}>
          <input
            type="hidden"
            name="competition_id"
            value={competition.id}
          />

          <button className="danger-button" type="submit">
            Archive
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function CompetitionsAdminPage({
  searchParams,
}: CompetitionsAdminPageProps) {
  const resolvedSearchParams = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const { data: activeCompetitions, error: activeError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          entry_cost,
          closing_date,
          access_code,
          accepting_entries,
          show_on_leaderboard
        `
      )
      .eq("is_active", true)
      .order("closing_date", {
        ascending: true,
        nullsFirst: false,
      });

  if (activeError) {
    console.error(
      "Unable to load active competitions:",
      activeError.message
    );
  }

  const { data: previousCompetitions, error: previousError } =
    await supabase
      .from("competitions")
      .select("id, name, closing_date")
      .eq("is_active", false)
      .order("closing_date", {
        ascending: false,
        nullsFirst: false,
      });

  if (previousError) {
    console.error(
      "Unable to load previous competitions:",
      previousError.message
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Competitions</h1>

          <p className="intro">
            Manage which competition is open for entries, which
            competition appears on the leaderboard, and which
            competitions are archived.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      {resolvedSearchParams?.success && (
        <section className="card success-card">
          <p>{resolvedSearchParams.success}</p>
        </section>
      )}

      {resolvedSearchParams?.error && (
        <section className="card error-card">
          <p>{resolvedSearchParams.error}</p>
        </section>
      )}

      <section className="card">
        <h2>Active competitions</h2>

        {!activeCompetitions || activeCompetitions.length === 0 ? (
          <p>No active competitions are currently available.</p>
        ) : (
          <div className="admin-links">
            {activeCompetitions.map((competition) =>
              renderCompetitionCard(competition)
            )}
          </div>
        )}

        <p className="input-help">
          A competition can be open for predictions, shown as the
          current leaderboard, both, or neither. Archive it once all
          results and scores are complete.
        </p>
      </section>

      <section className="card">
        <h2>Create new competition</h2>

        <form action={createCompetition}>
          <div className="form-grid">
            <div>
              <label htmlFor="name">Competition name</label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Premier League 2026 - Competition 2"
                required
              />
            </div>

            <div>
              <label htmlFor="access_code">Access code</label>

              <input
                id="access_code"
                name="access_code"
                type="text"
                placeholder="e.g. GARY2026"
                required
              />
            </div>

            <div>
              <label htmlFor="entry_cost">Entry cost</label>

              <input
                id="entry_cost"
                name="entry_cost"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="closing_date">Closing date</label>

              <input
                id="closing_date"
                name="closing_date"
                type="datetime-local"
                required
              />
            </div>

            <div>
              <label htmlFor="first_prize">1st prize</label>

              <input
                id="first_prize"
                name="first_prize"
                type="text"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="second_prize">2nd prize</label>

              <input
                id="second_prize"
                name="second_prize"
                type="text"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="third_prize">3rd prize</label>

              <input
                id="third_prize"
                name="third_prize"
                type="text"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prize_notes">Prize notes</label>

            <textarea
              id="prize_notes"
              name="prize_notes"
              rows={3}
              placeholder="Optional notes about prizes"
            />
          </div>

          <div className="form-actions">
            <button type="submit">Create new competition</button>
          </div>
        </form>

        <p className="input-help">
          Creating a new competition opens it for entries, but it
          does not replace the current leaderboard.
        </p>
      </section>

      <section className="card">
        <h2>Archived competitions</h2>

        {!previousCompetitions ||
        previousCompetitions.length === 0 ? (
          <p>No archived competitions yet.</p>
        ) : (
          <div className="admin-links">
            {previousCompetitions.map((competition) => (
              <div
                className="admin-tool-link"
                key={competition.id}
              >
                <strong>{competition.name}</strong>

                <p className="entry-meta">
                  Closed:{" "}
                  {competition.closing_date
                    ? new Date(
                        competition.closing_date
                      ).toLocaleString("en-GB")
                    : "Not recorded"}
                </p>

                <div className="form-actions">
                  <Link
                    className="button-link secondary"
                    href={`/previous-competitions/${competition.id}`}
                  >
                    View
                  </Link>

                  <form action={deleteArchivedCompetition}>
                    <input
                      type="hidden"
                      name="competition_id"
                      value={competition.id}
                    />

                    <button
                      className="danger-button"
                      type="submit"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="input-help">
          Deleting an archived competition also deletes its fixtures,
          entries and predictions.
        </p>
      </section>
    </main>
  );
}