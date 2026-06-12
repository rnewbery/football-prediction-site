import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import FixtureSearchClient from "./FixtureSearchClient";

type LocalFixture = {
  id: number;
  fixture_label: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  external_fixture_id: number | null;
};

export default async function FixtureSearchPage({
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

  const { data: competition } = await supabase
    .from("competitions")
    .select("id, name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { data: fixtures, error: fixturesError } =
    competition
      ? await supabase
          .from("fixtures")
          .select(
            "id, fixture_label, group_name, home_team, away_team, external_fixture_id"
          )
          .eq("competition_id", competition.id)
          .order("group_name", { ascending: true })
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
            Search API-Football by date, find the correct
            match, then link it to one of your own fixtures.
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
        <FixtureSearchClient
          localFixtures={(fixtures ?? []) as LocalFixture[]}
        />
      )}
    </main>
  );
}