import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LeaderboardRow = {
  entry_id: number;
  participant_name: string;
  participant_email: string | null;
  submitted_at: string;
  status: string;
  total_picks: number;
  win_picks: number;
  loss_picks: number;
  pending_picks: number;
  week_name: string;
  selected_teams: string;
};

type ParticipantSummary = {
  entry_id: number;
  participant_name: string;
  participant_email: string | null;
  submitted_at: string;
  status: string;
  total_picks: number;
  win_picks: number;
  loss_picks: number;
  pending_picks: number;
  weeks: Record<string, string>;
};

type ScoreCompetition = {
  id: number;
  name: string;
};

type LastManStandingCompetition = {
  id: number;
  name: string;
  closing_date: string | null;
  linked_competition_id: number;
};

function getStatusClass(status: string) {
  if (status.toLowerCase() === "still in") {
    return "position-badge position-first";
  }

  return "position-badge position-pending";
}

function buildParticipantSummaries(rows: LeaderboardRow[]) {
  const participantMap = new Map<number, ParticipantSummary>();
  const weekNames = new Set<string>();

  for (const row of rows) {
    weekNames.add(row.week_name);

    if (!participantMap.has(row.entry_id)) {
      participantMap.set(row.entry_id, {
        entry_id: row.entry_id,
        participant_name: row.participant_name,
        participant_email: row.participant_email,
        submitted_at: row.submitted_at,
        status: row.status,
        total_picks: row.total_picks,
        win_picks: row.win_picks,
        loss_picks: row.loss_picks,
        pending_picks: row.pending_picks,
        weeks: {},
      });
    }

    const participant = participantMap.get(row.entry_id);

    if (participant) {
      participant.weeks[row.week_name] = row.selected_teams;
    }
  }

  const participants = Array.from(participantMap.values()).sort(
    (firstParticipant, secondParticipant) => {
      const firstIsStillIn =
        firstParticipant.status.toLowerCase() === "still in";
      const secondIsStillIn =
        secondParticipant.status.toLowerCase() === "still in";

      if (firstIsStillIn && !secondIsStillIn) {
        return -1;
      }

      if (!firstIsStillIn && secondIsStillIn) {
        return 1;
      }

      if (firstParticipant.loss_picks !== secondParticipant.loss_picks) {
        return firstParticipant.loss_picks - secondParticipant.loss_picks;
      }

      if (secondParticipant.win_picks !== firstParticipant.win_picks) {
        return secondParticipant.win_picks - firstParticipant.win_picks;
      }

      return firstParticipant.participant_name.localeCompare(
        secondParticipant.participant_name
      );
    }
  );

  const orderedWeekNames = Array.from(weekNames).sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

  return {
    participants,
    weekNames: orderedWeekNames,
  };
}

export default async function LastManStandingLeaderboardPage() {
  const { data: scoreCompetition, error: scoreCompetitionError } =
    await supabase
      .from("competitions")
      .select(
        `
          id,
          name
        `
      )
      .eq("is_active", true)
      .eq("show_on_leaderboard", true)
      .limit(1)
      .maybeSingle();

  if (scoreCompetitionError) {
    console.error(
      "Unable to load current score leaderboard competition:",
      scoreCompetitionError.message
    );
  }

  const typedScoreCompetition =
    scoreCompetition as ScoreCompetition | null;

  const { data: competition, error: competitionError } =
    typedScoreCompetition
      ? await supabase
          .from("last_man_standing_competitions")
          .select(
            `
              id,
              name,
              closing_date,
              linked_competition_id
            `
          )
          .eq("is_active", true)
          .eq("linked_competition_id", typedScoreCompetition.id)
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

  const typedCompetition =
    competition as LastManStandingCompetition | null;

  if (competitionError) {
    console.error(
      "Unable to load Last Man Standing competition:",
      competitionError.message
    );
  }

  let leaderboardRows: LeaderboardRow[] = [];

  if (typedCompetition) {
    const { data, error } = await supabase.rpc(
      "get_last_man_standing_leaderboard",
      {
        p_lms_competition_id: typedCompetition.id,
      }
    );

    if (error) {
      console.error(
        "Unable to load Last Man Standing leaderboard:",
        error.message
      );
    } else {
      leaderboardRows = data ?? [];
    }
  }

  const { participants, weekNames } =
    buildParticipantSummaries(leaderboardRows);

  const stillIn = participants.filter(
    (participant) =>
      participant.status.toLowerCase() === "still in"
  );

  const out = participants.filter(
    (participant) =>
      participant.status.toLowerCase() !== "still in"
  );

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">
            {typedCompetition?.name ?? "Last Man Standing"}
          </p>

          <h1>Last Man Standing leaderboard</h1>

          <p className="intro">
            View who is still in, who is out, and which teams each
            person selected.
          </p>
        </div>

        <div className="form-actions">
          <Link className="button-link secondary" href="/">
            Back to homepage
          </Link>

          <Link
            className="button-link secondary"
            href="/last-man-standing"
          >
            Enter Last Man Standing
          </Link>
        </div>
      </div>

      {!typedScoreCompetition ? (
        <section className="card">
          <h2>No main leaderboard selected</h2>

          <p>
            No Premier League competition is currently selected as the
            main leaderboard.
          </p>
        </section>
      ) : !typedCompetition ? (
        <section className="card">
          <h2>No Last Man Standing game linked</h2>

          <p>
            The current Premier League leaderboard competition does
            not have a Last Man Standing game linked to it.
          </p>

          <div className="competition-details">
            <div>
              <span>Current Premier League leaderboard</span>
              <strong>{typedScoreCompetition.name}</strong>
            </div>
          </div>
        </section>
      ) : participants.length === 0 ? (
        <section className="card">
          <h2>No entries yet</h2>

          <p>
            No Last Man Standing entries have been submitted yet for
            this competition.
          </p>

          <div className="competition-details">
            <div>
              <span>Last Man Standing</span>
              <strong>{typedCompetition.name}</strong>
            </div>

            <div>
              <span>Linked Premier League competition</span>
              <strong>{typedScoreCompetition.name}</strong>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="admin-summary-grid">
            <article className="card admin-summary-card">
              <span>Still in</span>
              <strong>{stillIn.length}</strong>
            </article>

            <article className="card admin-summary-card">
              <span>Out</span>
              <strong>{out.length}</strong>
            </article>

            <article className="card admin-summary-card">
              <span>Total entries</span>
              <strong>{participants.length}</strong>
            </article>
          </section>

          <section className="card">
            <h2>Competition</h2>

            <div className="competition-details">
              <div>
                <span>Last Man Standing</span>
                <strong>{typedCompetition.name}</strong>
              </div>

              <div>
                <span>Linked Premier League competition</span>
                <strong>{typedScoreCompetition.name}</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Still in</h2>

            {stillIn.length === 0 ? (
              <p>No players are still in.</p>
            ) : (
              <div className="admin-links">
                {stillIn.map((participant) => (
                  <div
                    className="admin-tool-link"
                    key={participant.entry_id}
                  >
                    <strong>{participant.participant_name}</strong>

                    <p className="entry-meta">
                      Wins: {participant.win_picks} /{" "}
                      {participant.total_picks}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2>Full breakdown</h2>

            <p className="input-help">
              Each week shows the teams selected to win. A loss means
              one of the selected teams failed to win.
            </p>

            <div className="table-wrapper">
              <table className="breakdown-grid-table">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Status</th>
                    <th>Wins</th>
                    <th>Losses</th>
                    <th>Pending</th>

                    {weekNames.map((weekName) => (
                      <th key={weekName}>{weekName}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant.entry_id}>
                      <td className="breakdown-player-cell">
                        {participant.participant_name}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            participant.status
                          )}
                        >
                          {participant.status}
                        </span>
                      </td>

                      <td>{participant.win_picks}</td>
                      <td>{participant.loss_picks}</td>
                      <td>{participant.pending_picks}</td>

                      {weekNames.map((weekName) => (
                        <td key={`${participant.entry_id}-${weekName}`}>
                          {participant.weeks[weekName] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}