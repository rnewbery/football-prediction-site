"use client";

type FixtureRelationship = {
  fixture_label: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

type Prediction = {
  id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number;
  is_exact_score: boolean;
  fixture: FixtureRelationship | null;
};

type ParticipantRelationship = {
  name: string;
  email: string | null;
};

type Entry = {
  id: number;
  submitted_at: string;
  payment_status: string | null;
  participant: ParticipantRelationship | null;
  predictions: Prediction[];
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

export default function ExportEntriesButton({
  entries,
}: {
  entries: Entry[];
}) {
  function downloadCsv() {
    const headers = [
      "Entry ID",
      "Participant",
      "Email",
      "Payment status",
      "Submitted",
      "Game No.",
      "Fixture",
      "Prediction",
      "Actual result",
      "Points",
      "Exact score",
    ];

    const rows = entries.flatMap((entry) =>
      entry.predictions.map((prediction) => {
        const fixture = prediction.fixture;

        const hasResult =
          fixture?.home_score !== null &&
          fixture?.home_score !== undefined &&
          fixture?.away_score !== null &&
          fixture?.away_score !== undefined;

        const actualResult = hasResult
          ? `${fixture.home_score} - ${fixture.away_score}`
          : "Not played";

        const fixtureName = fixture
          ? `${fixture.home_team} v ${fixture.away_team}`
          : "Fixture unavailable";

        return [
          entry.id,
          entry.participant?.name ?? "Unnamed participant",
          entry.participant?.email ?? "",
          entry.payment_status ?? "pending",
          new Date(entry.submitted_at).toLocaleString("en-GB"),
          fixture?.group_name ?? "",
          fixtureName,
          `${prediction.predicted_home_score} - ${prediction.predicted_away_score}`,
          actualResult,
          prediction.points_awarded,
          prediction.is_exact_score ? "Yes" : "No",
        ];
      })
    );

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `competition-entries-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="secondary-button"
      type="button"
      onClick={downloadCsv}
      disabled={entries.length === 0}
    >
      Export entries CSV
    </button>
  );
}