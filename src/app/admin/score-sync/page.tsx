import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { updateLinkedScoresFromApi } from "./actions";

export const dynamic = "force-dynamic";

type LocalFixture = {
  id: number;
  competition_id: number;
  fixture_label: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  external_fixture_id: number | null;
};

export default async function ScoreSyncPage({
  searchParams,
}: {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();

  const resolvedSearchParams = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
      "Unable to load active competition:",
      competitionError.message
    );
  }

  const { data: allFixtures, error: fixturesError } =
    competition
      ? await supabase
          .from("fixtures")
          .select(
            "id, competition_id, fixture_label, group_name, home_team, away_team, home_score, away_score, status, external_fixture_id"
          )
          .eq("competition_id", competition.id)
          .order("group_name", { ascending: true })
      : { data: [], error: null };

  if (fixturesError) {
    console.error(
      "Unable to load fixtures:",
      fixturesError.message
    );
  }

  const fixtures = (allFixtures ?? []) as LocalFixture[];

  const linkedFixtures = fixtures.filter(
    (fixture) => fixture.external_fixture_id !== null
  );

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Update scores from API</h1>

          <p className="intro">
            Pull live scores and match statuses from API-Football
            for fixtures that have already been linked.
          </p>
        </div>

        <Link
          className="button-link secondary"
          href="/admin"
        >
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

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : (
        <>
          <section className="card">
            <h2>{competition.name}</h2>

            <p>
              Total fixtures in active competition:{" "}
              <strong>{fixtures.length}</strong>
            </p>

            <p>
              Linked fixtures found:{" "}
              <strong>{linkedFixtures.length}</strong>
            </p>

            <form action={updateLinkedScoresFromApi}>
              <button
                type="submit"
                disabled={linkedFixtures.length === 0}
              >
                Update linked scores from API
              </button>
            </form>

            {linkedFixtures.length === 0 && (
              <p className="form-message">
                No linked fixtures were found. The table below
                shows all fixtures and their current external
                fixture ID values.
              </p>
            )}
          </section>

          <section className="card">
            <h2>All fixtures in active competition</h2>

            <div className="table-wrapper">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Game No.</th>
                    <th>Fixture</th>
                    <th>Current score</th>
                    <th>Status</th>
                    <th>API fixture ID</th>
                  </tr>
                </thead>

                <tbody>
                  {fixtures.map((fixture) => {
                    const hasScore =
                      fixture.home_score !== null &&
                      fixture.home_score !== undefined &&
                      fixture.away_score !== null &&
                      fixture.away_score !== undefined;

                    return (
                      <tr key={fixture.id}>
                        <td>{fixture.id}</td>

                        <td>{fixture.group_name ?? ""}</td>

                        <td>
                          {fixture.home_team} v{" "}
                          {fixture.away_team}
                        </td>

                        <td>
                          {hasScore
                            ? `${fixture.home_score} - ${fixture.away_score}`
                            : "No score yet"}
                        </td>

                        <td>{fixture.status}</td>

                        <td>
                          {fixture.external_fixture_id ??
                            "Not linked"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}