import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { updateCompetition } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
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
  first_prize: string | null;
  second_prize: string | null;
  third_prize: string | null;
  prize_notes: string | null;
  accepting_entries: boolean;
  show_on_leaderboard: boolean;
};

function formatDateTimeLocalUk(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${year}-${month}-${day}T${hour}:${minute}`;
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

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
          access_code,
          first_prize,
          second_prize,
          third_prize,
          prize_notes,
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

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Competition settings</h1>

          <p className="intro">
            Edit competition details, entry codes, closing dates and
            prizes.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      {params.error && (
        <p className="form-message error-message">
          {params.error}
        </p>
      )}

      {params.success && (
        <p className="form-message success-message">
          {params.success}
        </p>
      )}

      {!competitions || competitions.length === 0 ? (
        <section className="card">
          <h2>No active competitions</h2>

          <p>No active competition is available.</p>

          <div className="form-actions">
            <Link
              className="button-link secondary"
              href="/admin/competitions"
            >
              Manage competitions
            </Link>
          </div>
        </section>
      ) : (
        <>
          {competitions.map((competition) => {
            const closingDateValue = formatDateTimeLocalUk(
              competition.closing_date
            );

            return (
              <section className="card" key={competition.id}>
                <p className="eyebrow">
                  {getCompetitionStatus(competition)}
                </p>

                <form action={updateCompetition}>
                  <input
                    type="hidden"
                    name="competition_id"
                    value={competition.id}
                  />

                  <h2>{competition.name}</h2>

                  <div className="settings-grid">
                    <div>
                      <label
                        htmlFor={`competition-name-${competition.id}`}
                      >
                        Competition name
                      </label>

                      <input
                        id={`competition-name-${competition.id}`}
                        name="name"
                        type="text"
                        defaultValue={competition.name}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`access-code-${competition.id}`}
                      >
                        Competition access code
                      </label>

                      <input
                        id={`access-code-${competition.id}`}
                        name="access_code"
                        type="text"
                        defaultValue={
                          competition.access_code ?? ""
                        }
                        placeholder="Example: GARY2026"
                        required
                      />

                      <p className="input-help">
                        People need this code before they can submit
                        an entry.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`entry-cost-${competition.id}`}
                      >
                        Entry cost
                      </label>

                      <input
                        id={`entry-cost-${competition.id}`}
                        name="entry_cost"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={
                          competition.entry_cost ?? 0
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`closing-date-${competition.id}`}
                      >
                        Closing date and time
                      </label>

                      <input
                        id={`closing-date-${competition.id}`}
                        name="closing_date"
                        type="datetime-local"
                        defaultValue={closingDateValue}
                      />
                    </div>
                  </div>

                  <h3>Prizes</h3>

                  <div className="settings-grid">
                    <div>
                      <label
                        htmlFor={`first-prize-${competition.id}`}
                      >
                        First prize
                      </label>

                      <input
                        id={`first-prize-${competition.id}`}
                        name="first_prize"
                        type="text"
                        defaultValue={
                          competition.first_prize ?? ""
                        }
                        placeholder="Example: £100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`second-prize-${competition.id}`}
                      >
                        Second prize
                      </label>

                      <input
                        id={`second-prize-${competition.id}`}
                        name="second_prize"
                        type="text"
                        defaultValue={
                          competition.second_prize ?? ""
                        }
                        placeholder="Example: £50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`third-prize-${competition.id}`}
                      >
                        Third prize
                      </label>

                      <input
                        id={`third-prize-${competition.id}`}
                        name="third_prize"
                        type="text"
                        defaultValue={
                          competition.third_prize ?? ""
                        }
                        placeholder="Example: £25"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`prize-notes-${competition.id}`}
                      >
                        Prize notes
                      </label>

                      <textarea
                        id={`prize-notes-${competition.id}`}
                        name="prize_notes"
                        defaultValue={
                          competition.prize_notes ?? ""
                        }
                        placeholder="Example: Prizes depend on number of entries."
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit">Save settings</button>
                  </div>
                </form>
              </section>
            );
          })}

          <section className="card">
            <h2>Scoring rules</h2>

            <p>
              These are currently fixed for the standard football
              competition.
            </p>

            <div className="competition-details">
              <div>
                <span>Exact score</span>
                <strong>5 points</strong>
              </div>

              <div>
                <span>Result + 1 score</span>
                <strong>3 points</strong>
              </div>

              <div>
                <span>Result only</span>
                <strong>2 points</strong>
              </div>

              <div>
                <span>Wrong result + 1 score</span>
                <strong>1 point</strong>
              </div>

              <div>
                <span>Wrong result</span>
                <strong>0 points</strong>
              </div>

              <div>
                <span>Correct draw</span>
                <strong>3 points</strong>
              </div>
            </div>

            <p className="input-help">
              Different competition types can be added later as scoring
              templates.
            </p>
          </section>
        </>
      )}
    </main>
  );
}