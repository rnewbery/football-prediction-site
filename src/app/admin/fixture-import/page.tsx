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

          <h1>Paste fixtures from Excel</h1>

          <p className="intro">
            Add lots of fixtures at once by copying rows from Excel
            and pasting them into the box below.
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
          Fixtures will be added to:{" "}
          <strong>
            {competition?.name ?? "No active competition"}
          </strong>
        </p>
      </section>

      <section className="card">
        <h2>Copy and paste fixture rows</h2>

        <p>
          Use this if the fixtures are already in a spreadsheet.
          Copy the columns from Excel and paste them below.
        </p>

        <p>
          Use these column headings:
        </p>

        <pre className="code-example">
{`Week,Date,Group,Home Team,Away Team
1,11 Jun 2026 20:00,A,Mexico,South Africa
1,11 Jun 2026 23:00,A,South Korea,Czechia
1,12 Jun 2026 20:00,B,Canada,Bosnia and Herzegovina`}
        </pre>

        <form action={importFixtures}>
          <div>
            <label htmlFor="fixture_csv">Fixture list</label>

            <textarea
              id="fixture_csv"
              name="fixture_csv"
              rows={12}
              placeholder={`Week,Date,Group,Home Team,Away Team
1,11 Jun 2026 20:00,A,Mexico,South Africa
1,11 Jun 2026 23:00,A,South Korea,Czechia
1,12 Jun 2026 20:00,B,Canada,Bosnia and Herzegovina`}
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
          The Date column should use this format: 11 Jun 2026 20:00.
          The Group column can be left blank if it is not needed.
        </p>

        <p className="input-help">
          This does not upload an Excel file. It copies the rows from
          Excel into the website, which is simpler and less likely to
          break.
        </p>
      </section>
    </main>
  );
}