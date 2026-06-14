import Link from "next/link";
import { supabase } from "@/lib/supabase";
export const dynamic = "force-dynamic";

type Competition = {
  id: number;
  name: string;
  entry_cost: number | null;
  closing_date: string | null;
};

export default async function PreviousCompetitionsPage() {
  const { data: competitions, error } = await supabase
    .from("competitions")
    .select("id, name, entry_cost, closing_date")
    .eq("is_active", false)
    .order("closing_date", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    console.error(
      "Unable to load previous competitions:",
      error.message
    );
  }

  const previousCompetitions =
    (competitions ?? []) as Competition[];

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Gary&apos;s Football Comps</p>

          <h1>Previous competitions</h1>

          <p className="intro">
            View completed competitions, final leaderboards and past
            results.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      {previousCompetitions.length === 0 ? (
        <section className="card">
          <p>No previous competitions are available yet.</p>
        </section>
      ) : (
        <section className="archive-list">
          {previousCompetitions.map((competition) => (
            <article
              className="card archive-card"
              key={competition.id}
            >
              <h2>{competition.name}</h2>

              <div className="competition-details">
                <div>
                  <span>Entry cost</span>

                  <strong>
                    {competition.entry_cost !== null
                      ? `£${Number(competition.entry_cost).toFixed(2)}`
                      : "Not recorded"}
                  </strong>
                </div>

                <div>
                  <span>Closed</span>

                  <strong>
                    {competition.closing_date
                      ? new Date(
                          competition.closing_date
                        ).toLocaleString("en-GB")
                      : "Not recorded"}
                  </strong>
                </div>
              </div>

              <div className="form-actions">
                <Link
                  className="button-link secondary"
                  href={`/previous-competitions/${competition.id}`}
                >
                  View final leaderboard
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}