import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import FixtureSearchClient from "./FixtureSearchClient";

type LocalFixture = {
  id: number;
  fixture_label: string | null;
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  external_fixture_id: number | null;
};

type FixtureSearchPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    date_from?: string;
    date_to?: string;
    competition_filter?: string;
  }>;
};

export default async function FixtureSearchPage({
  searchParams,
}: FixtureSearchPageProps) {
  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = await searchParams;

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
      "Unable to load active competition:",
      competitionError.message
    );
  }

  const { data: fixtures, error: fixturesError } =
    competition
      ? await supabase
          .from("fixtures")
          .select(
            `
              id,
              fixture_label,
              kickoff_at,
              kickoff_sort_key,
              group_name,
              home_team,
              away_team,
              external_fixture_id
            `
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
      "Unable to load local fixtures:",
      fixturesError.message
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Search football fixtures</h1>

          <p className="intro">
            Search API-Football across a date range, find the
            correct matches, then link them to your local fixtures.
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

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : (
        <FixtureSearchClient
          localFixtures={(fixtures ?? []) as LocalFixture[]}
          initialDateFrom={resolvedSearchParams?.date_from ?? ""}
          initialDateTo={resolvedSearchParams?.date_to ?? ""}
          initialCompetitionFilter={
            resolvedSearchParams?.competition_filter ??
            "premier-league-and-world-cup"
          }
        />
      )}
    </main>
  );
}