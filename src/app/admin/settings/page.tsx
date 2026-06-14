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

  const { data: competition } = await supabase
    .from("competitions")
    .select(`
      id,
      name,
      entry_cost,
      closing_date,
      exact_score_points,
      correct_result_points,
      incorrect_result_points,
      access_code,
      first_prize,
      second_prize,
      third_prize,
      prize_notes
    `)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const closingDateValue = formatDateTimeLocalUk(
    competition?.closing_date ?? null
  );

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Competition settings</h1>

          <p className="intro">
            Edit the competition details, access code, prizes and
            scoring rules.
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

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : (
        <section className="card">
          <form action={updateCompetition}>
            <input
              type="hidden"
              name="competition_id"
              value={competition.id}
            />

            <h2>Basic details</h2>

            <div className="settings-grid">
              <div>
                <label htmlFor="competition-name">
                  Competition name
                </label>

                <input
                  id="competition-name"
                  name="name"
                  type="text"
                  defaultValue={competition.name}
                  required
                />
              </div>

              <div>
                <label htmlFor="access-code">
                  Competition access code
                </label>

                <input
                  id="access-code"
                  name="access_code"
                  type="text"
                  defaultValue={competition.access_code ?? ""}
                  placeholder="Example: GARY2026"
                  required
                />

                <p className="input-help">
                  People need this code before they can submit an
                  entry.
                </p>
              </div>

              <div>
                <label htmlFor="entry-cost">Entry cost</label>

                <input
                  id="entry-cost"
                  name="entry_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={competition.entry_cost}
                />
              </div>

              <div>
                <label htmlFor="closing-date">
                  Closing date and time
                </label>

                <input
                  id="closing-date"
                  name="closing_date"
                  type="datetime-local"
                  defaultValue={closingDateValue}
                />
              </div>
            </div>

            <h2>Prizes</h2>

            <div className="settings-grid">
              <div>
                <label htmlFor="first-prize">
                  First prize
                </label>

                <input
                  id="first-prize"
                  name="first_prize"
                  type="text"
                  defaultValue={competition.first_prize ?? ""}
                  placeholder="Example: £100"
                />
              </div>

              <div>
                <label htmlFor="second-prize">
                  Second prize
                </label>

                <input
                  id="second-prize"
                  name="second_prize"
                  type="text"
                  defaultValue={competition.second_prize ?? ""}
                  placeholder="Example: £50"
                />
              </div>

              <div>
                <label htmlFor="third-prize">
                  Third prize
                </label>

                <input
                  id="third-prize"
                  name="third_prize"
                  type="text"
                  defaultValue={competition.third_prize ?? ""}
                  placeholder="Example: £25"
                />
              </div>

              <div>
                <label htmlFor="prize-notes">
                  Prize notes
                </label>

                <textarea
                  id="prize-notes"
                  name="prize_notes"
                  defaultValue={competition.prize_notes ?? ""}
                  placeholder="Example: Prizes depend on number of paid entries."
                  rows={4}
                />
              </div>
            </div>

            <h2>Scoring rules</h2>

            <div className="settings-grid">
              <div>
                <label htmlFor="exact-points">
                  Exact-score points
                </label>

                <input
                  id="exact-points"
                  name="exact_score_points"
                  type="number"
                  min="0"
                  defaultValue={
                    competition.exact_score_points
                  }
                />
              </div>

              <div>
                <label htmlFor="result-points">
                  Correct-result points
                </label>

                <input
                  id="result-points"
                  name="correct_result_points"
                  type="number"
                  min="0"
                  defaultValue={
                    competition.correct_result_points
                  }
                />
              </div>

              <div>
                <label htmlFor="incorrect-points">
                  Incorrect-result points
                </label>

                <input
                  id="incorrect-points"
                  name="incorrect_result_points"
                  type="number"
                  min="0"
                  defaultValue={
                    competition.incorrect_result_points
                  }
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit">Save settings</button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}