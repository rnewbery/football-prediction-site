import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Football prediction competition</p>

        <h1>Predict the scores. Follow the leaderboard.</h1>

        <p className="intro">
          Enter your predictions for the current competition and see how you
          compare once the results begin.
        </p>

        <div className="actions">
          <Link className="button-link" href="/predict">
            Enter predictions
          </Link>

          <Link className="button-link secondary" href="/leaderboard">
            View leaderboard
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Current competition</h2>

        <div className="competition-details">
          <div>
            <span>Competition</span>
            <strong>Next Football Competition</strong>
          </div>

          <div>
            <span>Entry cost</span>
            <strong>£5.00</strong>
          </div>

          <div>
            <span>Closing date</span>
            <strong>To be confirmed</strong>
          </div>
        </div>
      </section>
    </main>
  );
}