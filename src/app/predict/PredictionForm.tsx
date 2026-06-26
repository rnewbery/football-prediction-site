"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fixture = {
  id: number;
  fixture_label: string | null;
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
};

type PredictionFormProps = {
  competitionId: number;
  fixtures: Fixture[];
};

type PredictionScores = {
  home: string;
  away: string;
};

type SavedPredictionDraft = {
  name: string;
  email: string;
  accessCode: string;
  scores: Record<number, PredictionScores>;
};

export default function PredictionForm({
  competitionId,
  fixtures,
}: PredictionFormProps) {
  const storageKey = `prediction-draft-${competitionId}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [scores, setScores] = useState<
    Record<number, PredictionScores>
  >({});

  const [message, setMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(storageKey);

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(
          savedDraft
        ) as SavedPredictionDraft;

        setName(parsedDraft.name ?? "");
        setEmail(parsedDraft.email ?? "");
        setAccessCode(parsedDraft.accessCode ?? "");
        setScores(parsedDraft.scores ?? {});
        setDraftMessage(
          "Saved progress restored from this device."
        );
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setHasLoadedDraft(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedDraft || hasSubmitted) {
      return;
    }

    const hasAnyDraftContent =
      name.trim() ||
      email.trim() ||
      accessCode.trim() ||
      Object.values(scores).some(
        (fixtureScores) =>
          fixtureScores.home !== "" || fixtureScores.away !== ""
      );

    if (!hasAnyDraftContent) {
      window.localStorage.removeItem(storageKey);
      setDraftMessage("");
      return;
    }

    const draft: SavedPredictionDraft = {
      name,
      email,
      accessCode,
      scores,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(draft));
    setDraftMessage("Progress saved on this device.");
  }, [
    name,
    email,
    accessCode,
    scores,
    hasLoadedDraft,
    hasSubmitted,
    storageKey,
  ]);

  function updateScore(
    fixtureId: number,
    side: "home" | "away",
    value: string
  ) {
    if (hasSubmitted) {
      return;
    }

    setScores((currentScores) => ({
      ...currentScores,
      [fixtureId]: {
        home: currentScores[fixtureId]?.home ?? "",
        away: currentScores[fixtureId]?.away ?? "",
        [side]: value,
      },
    }));
  }

  function clearDraft() {
    window.localStorage.removeItem(storageKey);
    setName("");
    setEmail("");
    setAccessCode("");
    setScores({});
    setMessage("");
    setDraftMessage("");
    setHasSubmitted(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasSubmitted) {
      return;
    }

    setMessage("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedAccessCode = accessCode.trim();

    if (!trimmedName) {
      setMessage("Please enter your name.");
      return;
    }

    if (!trimmedAccessCode) {
      setMessage("Please enter the competition access code.");
      return;
    }

    const hasMissingScore = fixtures.some((fixture) => {
      const fixtureScores = scores[fixture.id];

      return (
        !fixtureScores ||
        fixtureScores.home === "" ||
        fixtureScores.away === ""
      );
    });

    if (hasMissingScore) {
      setMessage("Please enter a score for every fixture.");
      return;
    }

    const predictionRows = fixtures.map((fixture) => ({
      fixture_id: fixture.id,
      predicted_home_score: Number(scores[fixture.id].home),
      predicted_away_score: Number(scores[fixture.id].away),
    }));

    setIsSubmitting(true);

    const { data: entryId, error } = await supabase.rpc(
      "submit_predictions",
      {
        p_competition_id: competitionId,
        p_participant_name: trimmedName,
        p_participant_email: trimmedEmail,
        p_access_code: trimmedAccessCode,
        p_predictions: predictionRows,
      }
    );

    if (error || !entryId) {
      console.log("Submission error:", error);

      if (
        error?.message
          ?.toLowerCase()
          .includes("access code")
      ) {
        setMessage(
          "The competition access code is incorrect. Please check it and try again."
        );
      } else {
        setMessage(
          error?.message ??
            "Your predictions could not be submitted."
        );
      }

      setIsSubmitting(false);
      return;
    }

    window.localStorage.removeItem(storageKey);

    setMessage(
      `s have been submitted. Entry reference: ${entryId}.`
    );

    setAccessCode("");
    setDraftMessage("");
    setHasSubmitted(true);
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className="card">
        <div className="form-grid">
          <div>
            <label htmlFor="name">Name</label>

            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              readOnly={hasSubmitted}
              required
            />
          </div>

          <div>
            <label htmlFor="email">
              Email address (optional)
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={hasSubmitted}
            />
          </div>

          {!hasSubmitted && (
            <div>
              <label htmlFor="access-code">
                Competition access code
              </label>

              <input
                id="access-code"
                name="access_code"
                type="text"
                value={accessCode}
                onChange={(event) =>
                  setAccessCode(event.target.value)
                }
                placeholder="Enter the code from the organiser"
                required
              />
            </div>
          )}
        </div>

        {!hasSubmitted ? (
          <>
            <p className="form-message">
              Your progress will save automatically on this device
              until you submit your entry.
            </p>

            {draftMessage && (
              <p className="input-help">{draftMessage}</p>
            )}
          </>
        ) : (
          <p className="form-message success-message">
            Your submitted predictions are shown below for printing.
          </p>
        )}
      </section>

      <section className="card">
        <h2>
          {hasSubmitted
            ? "Submitted predictions"
            : "Fixtures"}
        </h2>

        <div className="table-wrapper">
          <table className="fixtures-table">
            <thead>
              <tr>
                <th>Date / time</th>
                <th>Week / group</th>
                <th>Home Team</th>
                <th>Home Score</th>
                <th>Away Score</th>
                <th>Away Team</th>
              </tr>
            </thead>

            <tbody>
              {fixtures.map((fixture) => (
                <tr key={fixture.id}>
                  <td>
                    {fixture.kickoff_at ?? fixture.fixture_label}
                  </td>

                  <td>{fixture.group_name ?? ""}</td>

                  <td>{fixture.home_team}</td>

                  <td>
                    <input
                      className="score-input"
                      type="number"
                      min="0"
                      step="1"
                      value={scores[fixture.id]?.home ?? ""}
                      onChange={(event) =>
                        updateScore(
                          fixture.id,
                          "home",
                          event.target.value
                        )
                      }
                      aria-label={`${fixture.home_team} predicted score`}
                      readOnly={hasSubmitted}
                      required
                    />
                  </td>

                  <td>
                    <input
                      className="score-input"
                      type="number"
                      min="0"
                      step="1"
                      value={scores[fixture.id]?.away ?? ""}
                      onChange={(event) =>
                        updateScore(
                          fixture.id,
                          "away",
                          event.target.value
                        )
                      }
                      aria-label={`${fixture.away_team} predicted score`}
                      readOnly={hasSubmitted}
                      required
                    />
                  </td>

                  <td>{fixture.away_team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {message && <p className="form-message">{message}</p>}

        <div className="form-actions">
          {!hasSubmitted && (
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : "Submit predictions"}
            </button>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={() => window.print()}
          >
            {hasSubmitted
              ? "Print predictions"
              : "Print this sheet"}
          </button>

          {!hasSubmitted && (
            <button
              className="secondary-button"
              type="button"
              onClick={clearDraft}
            >
              Clear saved draft
            </button>
          )}
        </div>
      </section>
    </form>
  );
}