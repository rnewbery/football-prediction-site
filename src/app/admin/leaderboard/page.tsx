import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PrintButton from "@/app/leaderboard/PrintButton";

type LeaderboardEntry = {
  participant_name: string;
  total_points: number;
  exact_scores: number;
};

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function buildLeaderboardCsv(leaderboard: LeaderboardEntry[]) {
  const headers = [
    "Position",
    "Participant",
    "Points",
    "Exact scores",
  ];

  const rows = leaderboard.map((entry, index) => [
    index + 1,
    entry.participant_name,
    entry.total_points,
    entry.exact_scores,
  ]);

  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
}

export default async function AdminLeaderboardPage() {
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

  let leaderboard: LeaderboardEntry[] = [];

  if (competition) {
    const { data, error } = await supabase.rpc(
      "get_competition_leaderboard",
      {
        p_competition_id: competition.id,
      }
    );

    if (error) {
      console.error(
        "Unable to load admin leaderboard:",
        error.message
      );
    } else {
      leaderboard = data ?? [];
    }
  }

  const csvContent = buildLeaderboardCsv(leaderboard);
  const csvDownloadHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    csvContent
  )}`;

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administrator area</p>

          <h1>Leaderboard</h1>

          <p className="intro">
            View the approved leaderboard without entering the
            public access code.
          </p>
        </div>

        <Link
          className="button-link secondary"
          href="/admin"
        >
          Back to dashboard
        </Link>
      </div>

      <section className="card">
        <h2>{competition?.name ?? "Current competition"}</h2>

        {!competition ? (
          <p>No active competition is available.</p>
        ) : leaderboard.length === 0 ? (
          <p>
            No approved entries are available yet. Entries only
            appear here once they have been approved as paid.
          </p>
        ) : (
          <>
            <p className="form-message">
              Only approved / paid entries are shown.
            </p>

            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Participant</th>
                    <th>Points</th>
                    <th>Exact scores</th>
                  </tr>
                </thead>

                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={`${entry.participant_name}-${index}`}
                    >
                      <td>
                        <strong>{index + 1}</strong>
                      </td>

                      <td>{entry.participant_name}</td>
                      <td>{entry.total_points}</td>
                      <td>{entry.exact_scores}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <PrintButton />

              <a
                className="button-link secondary"
                href={csvDownloadHref}
                download={`leaderboard-${competition.name
                  .toLowerCase()
                  .replaceAll(" ", "-")}.csv`}
              >
                Export leaderboard CSV
              </a>
            </div>
          </>
        )}
      </section>
    </main>
  );
}