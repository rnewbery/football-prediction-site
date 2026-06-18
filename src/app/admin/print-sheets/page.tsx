import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PrintSheetButton from "./PrintSheetButton";

export const dynamic = "force-dynamic";

type Fixture = {
  id: number;
  fixture_label: string | null;
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
};

function formatDateLabel(fixture: Fixture) {
  if (fixture.kickoff_at) {
    return fixture.kickoff_at;
  }

  if (fixture.fixture_label) {
    return fixture.fixture_label;
  }

  return "";
}

function formatGeneratedAt() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PrintSheetsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, name, closing_date")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load competition:",
      competitionError.message
    );
  }

  const { data: fixtures, error: fixturesError } = competition
    ? await supabase
        .from("fixtures")
        .select(
          "id, fixture_label, kickoff_at, kickoff_sort_key, group_name, home_team, away_team"
        )
        .eq("competition_id", competition.id)
        .order("kickoff_sort_key", {
          ascending: true,
          nullsFirst: false,
        })
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (fixturesError) {
    console.error(
      "Unable to load fixtures:",
      fixturesError.message
    );
  }

  return (
    <main>
      <div className="page-header no-print">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Print prediction sheets</h1>

          <p className="intro">
            Print blank prediction sheets for people who want to
            fill in their scores by hand.
          </p>
        </div>

        <Link className="button-link secondary" href="/admin">
          Back to dashboard
        </Link>
      </div>

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : !fixtures || fixtures.length === 0 ? (
        <section className="card">
          <p>No fixtures have been added yet.</p>
        </section>
      ) : (
        <>
          <section className="card no-print">
            <h2>Blank prediction sheet</h2>

            <p>
              This uses the fixtures already entered on the website.
              Print this page and give it to people who do not want
              to submit online.
            </p>

            <div className="form-actions">
              <PrintSheetButton />
            </div>
          </section>

          <section className="print-sheet">
            <div className="print-sheet-topline">
              <span>{formatGeneratedAt()}</span>
              <strong>Gary&apos;s Football Comps</strong>
              <span />
            </div>

            <h1 className="print-sheet-title">
              {competition.name}
            </h1>

            <div className="print-name-row compact">
              <span>Name:</span>
              <div />
            </div>

            <table className="print-fixtures-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>VS</th>
                  <th>Team</th>
                  <th>Score</th>
                  <th>Score</th>
                </tr>
              </thead>

              <tbody>
                {fixtures.map((fixture) => (
                  <tr key={fixture.id}>
                    <td>{formatDateLabel(fixture)}</td>
                    <td>{fixture.home_team}</td>
                    <td>VS</td>
                    <td>{fixture.away_team}</td>
                    <td className="score-box" />
                    <td className="score-box" />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}