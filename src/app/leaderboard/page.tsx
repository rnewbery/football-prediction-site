import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LeaderboardClient from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name,
          first_prize,
          second_prize,
          third_prize,
          prize_notes
        `
      )
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
          <p className="eyebrow">
            {competition?.name ?? "Current competition"}
          </p>

          <h1>Leaderboard</h1>

          <p className="intro">
            Enter the competition code to view the approved
            leaderboard and competition information.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      {!competition ? (
        <section className="card">
          <p>No active competition is available.</p>
        </section>
      ) : (
        <LeaderboardClient
          competitionId={competition.id}
          firstPrize={competition.first_prize}
          secondPrize={competition.second_prize}
          thirdPrize={competition.third_prize}
          prizeNotes={competition.prize_notes}
        />
      )}
    </main>
  );
}