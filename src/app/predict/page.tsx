import Link from "next/link";

const fixtures = [
  {
    id: 1,
    date: "Thu 11 June",
    group: "A",
    home: "Mexico",
    away: "South Africa",
  },
  {
    id: 2,
    date: "Fri 12 June",
    group: "A",
    home: "South Korea",
    away: "Czech Republic",
  },
  {
    id: 3,
    date: "Fri 12 June",
    group: "B",
    home: "Canada",
    away: "Bosnia",
  },
];

export default function PredictPage() {
  return (
    <main>
      <div className="page-header">
        <div>
          <p className="eyebrow">Current competition</p>
          <h1>Enter your predictions</h1>
          <p className="intro">
            Enter your name and predicted score for each fixture.
          </p>
        </div>

        <Link className="button-link secondary" href="/">
          Back to homepage
        </Link>
      </div>

      <section className="card">
        <div className="form-grid">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" />
          </div>

          <div>
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Fixtures</h2>

        <div className="table-wrapper">
          <table className="fixtures-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Group</th>
                <th>Home team</th>
                <th>Home</th>
                <th>Away</th>
                <th>Away team</th>
              </tr>
            </thead>

            <tbody>
              {fixtures.map((fixture) => (
                <tr key={fixture.id}>
                  <td>{fixture.date}</td>
                  <td>{fixture.group}</td>
                  <td>{fixture.home}</td>
                  <td>
                    <input
                      className="score-input"
                      type="number"
                      min="0"
                      aria-label={`${fixture.home} predicted score`}
                    />
                  </td>
                  <td>
                    <input
                      className="score-input"
                      type="number"
                      min="0"
                      aria-label={`${fixture.away} predicted score`}
                    />
                  </td>
                  <td>{fixture.away}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button type="button">Submit predictions</button>
          <button className="secondary-button" type="button">
            Print this sheet
          </button>
        </div>
      </section>
    </main>
  );
}