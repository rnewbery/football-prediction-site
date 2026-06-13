import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { importFixtures } from "./actions";

type FixtureImportPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function FixtureImportPage({
  searchParams,
}: FixtureImportPageProps) {
  const resolvedSearchParams = await searchParams;

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
      .select("id, name")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (competitionError) {
    console.error(
      "Unable to load competition:",
      competitionError.message
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Import fixtures</h1>

          <p className="intro">
            Paste fixture rows from Excel or a CSV file into the
            current active competition.
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
        <h2>Current competition</h2>

        <p>
          Fixtures will be imported into:{" "}
          <strong>
            {competition?.name ?? "No active competition"}
          </strong>
        </p>
      </section>

      <section className="card">
        <h2>Paste fixture CSV</h2>

        <p>Use this exact header row:</p>

        <pre className="code-example">
{`game_number,kickoff_at,home_team,away_team
1,11 Jun 2026 20:00,Mexico,South Africa
2,11 Jun 2026 23:00,South Korea,Czechia
3,12 Jun 2026 20:00,Canada,Bosnia and Herzegovina`}
        </pre>

        <form action={importFixtures}>
          <div>
            <label htmlFor="fixture_csv">Fixture rows</label>

            <textarea
              id="fixture_csv"
              name="fixture_csv"
              rows={12}
              placeholder={`game_number,kickoff_at,home_team,away_team
1,11 Jun 2026 20:00,Mexico,South Africa
2,11 Jun 2026 23:00,South Korea,Czechia`}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit">Import fixtures</button>

            <Link
              className="button-link secondary"
              href="/admin/fixtures"
            >
              View fixtures
            </Link>
          </div>
        </form>

        <p className="input-help">
          Kickoff date and time must use this format: 11 Jun 2026
          20:00. Fixtures will be ordered from earliest to latest
          on the prediction page.
        </p>
      </section>
    </main>
  );
}