import Link from "next/link";

const leaderboard = [
  {
    position: 1,
    previousPosition: 2,
    name: "Alfie",
    points: 24,
    exactScores: 3,
  },
  {
    position: 2,
    previousPosition: 1,
    name: "Sean",
    points: 21,
    exactScores: 2,
  },
  {
    position: 3,
    previousPosition: 4,
    name: "Margaret",
    points: 18,
    exactScores: 2,
  },
];

export default function LeaderboardPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Current competition</p>
          <h1>Leaderboard</h1>
          <p className="intro">
            See the latest positions and points for the competition.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      <section className="card">
        <div className="table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Previous</th>
                <th>Participant</th>
                <th>Points</th>
                <th>Exact scores</th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.name}>
                  <td>
                    <strong>{entry.position}</strong>
                  </td>
                  <td>{entry.previousPosition}</td>
                  <td>{entry.name}</td>
                  <td>{entry.points}</td>
                  <td>{entry.exactScores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button className="secondary-button" type="button">
            Print leaderboard
          </button>
        </div>
      </section>
    </main>
  );
}