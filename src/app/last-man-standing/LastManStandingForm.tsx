"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type WeekRule = {
  id: number;
  week_name: string;
  required_picks: number;
};

type Fixture = {
  id: number;
  fixture_label: string | null;
  kickoff_at: string | null;
  kickoff_sort_key: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
};

type LastManStandingFormProps = {
  competitionId: number;
  competitionName: string;
  weekRules: WeekRule[];
  fixtures: Fixture[];
};

type SelectedPicks = Record<number, string>;

type SavedDraft = {
  name: string;
  email: string;
  accessCode: string;
  selectedPicks: SelectedPicks;
};

function normalise(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export default function LastManStandingForm({
  competitionId,
  competitionName,
  weekRules,
  fixtures,
}: LastManStandingFormProps) {
  const storageKey = `last-man-standing-draft-${competitionId}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [selectedPicks, setSelectedPicks] = useState<SelectedPicks>(
    {}
  );

  const [message, setMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  const fixturesByWeek = useMemo(() => {
    const groupedFixtures = new Map<string, Fixture[]>();

    for (const rule of weekRules) {
      groupedFixtures.set(normalise(rule.week_name), []);
    }

    for (const fixture of fixtures) {
      const weekKey = normalise(fixture.group_name);

      if (groupedFixtures.has(weekKey)) {
        groupedFixtures.get(weekKey)?.push(fixture);
      }
    }

    return groupedFixtures;
  }, [fixtures, weekRules]);

  const pickedTeams = Object.values(selectedPicks).filter(Boolean);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(storageKey);

    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft) as SavedDraft;

        setName(parsedDraft.name ?? "");
        setEmail(parsedDraft.email ?? "");
        setAccessCode(parsedDraft.accessCode ?? "");
        setSelectedPicks(parsedDraft.selectedPicks ?? {});
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
    if (!hasLoadedDraft) {
      return;
    }

    const hasAnyDraftContent =
      name.trim() ||
      email.trim() ||
      accessCode.trim() ||
      Object.keys(selectedPicks).length > 0;

    if (!hasAnyDraftContent) {
      window.localStorage.removeItem(storageKey);
      setDraftMessage("");
      return;
    }

    const draft: SavedDraft = {
      name,
      email,
      accessCode,
      selectedPicks,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(draft));
    setDraftMessage("Progress saved on this device.");
  }, [
    name,
    email,
    accessCode,
    selectedPicks,
    hasLoadedDraft,
    storageKey,
  ]);

  function updatePick(fixtureId: number, teamName: string) {
    setSelectedPicks((currentPicks) => {
      const existingPick = currentPicks[fixtureId];

      if (existingPick === teamName) {
        const updatedPicks = { ...currentPicks };
        delete updatedPicks[fixtureId];
        return updatedPicks;
      }

      return {
        ...currentPicks,
        [fixtureId]: teamName,
      };
    });
  }

  function clearDraft() {
    window.localStorage.removeItem(storageKey);
    setName("");
    setEmail("");
    setAccessCode("");
    setSelectedPicks({});
    setMessage("");
    setDraftMessage("");
  }

  function validateSelections() {
    const trimmedName = name.trim();
    const trimmedAccessCode = accessCode.trim();

    if (!trimmedName) {
      return "Please enter your name.";
    }

    if (!trimmedAccessCode) {
      return "Please enter the competition access code.";
    }

    const duplicateTeam = pickedTeams.find(
      (team, index) =>
        pickedTeams.findIndex(
          (otherTeam) =>
            otherTeam.trim().toLowerCase() ===
            team.trim().toLowerCase()
        ) !== index
    );

    if (duplicateTeam) {
      return `You have selected ${duplicateTeam} more than once. Each team can only be selected once.`;
    }

    for (const rule of weekRules) {
      const weekFixtures =
        fixturesByWeek.get(normalise(rule.week_name)) ?? [];

      const selectedCount = weekFixtures.filter(
        (fixture) => selectedPicks[fixture.id]
      ).length;

      if (selectedCount !== rule.required_picks) {
        return `${rule.week_name}: please select exactly ${rule.required_picks} team${
          rule.required_picks === 1 ? "" : "s"
        }.`;
      }
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const validationError = validateSelections();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const picks = Object.entries(selectedPicks).map(
      ([fixtureId, selectedTeam]) => ({
        fixture_id: Number(fixtureId),
        selected_team: selectedTeam,
      })
    );

    setIsSubmitting(true);

    const { data: entryId, error } = await supabase.rpc(
      "submit_last_man_standing_entry",
      {
        p_lms_competition_id: competitionId,
        p_participant_name: name.trim(),
        p_participant_email: email.trim(),
        p_access_code: accessCode.trim(),
        p_picks: picks,
      }
    );

    if (error || !entryId) {
      console.log("Last Man Standing submission error:", error);

      setMessage(
        error?.message ??
          "Your Last Man Standing entry could not be submitted."
      );

      setIsSubmitting(false);
      return;
    }

    window.localStorage.removeItem(storageKey);

    setMessage(
      `Your Last Man Standing entry has been submitted. Entry reference: ${entryId}.`
    );

    setName("");
    setEmail("");
    setAccessCode("");
    setSelectedPicks({});
    setDraftMessage("");
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <section className="card">
        <h2>{competitionName}</h2>

        <div className="form-grid">
          <div>
            <label htmlFor="lms-name">Name</label>

            <input
              id="lms-name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="lms-email">
              Email address (optional)
            </label>

            <input
              id="lms-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="lms-access-code">
              Competition access code
            </label>

            <input
              id="lms-access-code"
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
        </div>

        <p className="form-message">
          Pick the required number of teams each week. If any selected
          team fails to win, you are out. You cannot choose the same
          team more than once.
        </p>

        {draftMessage && (
          <p className="input-help">{draftMessage}</p>
        )}
      </section>

      {weekRules.map((rule) => {
        const weekFixtures =
          fixturesByWeek.get(normalise(rule.week_name)) ?? [];

        const selectedCount = weekFixtures.filter(
          (fixture) => selectedPicks[fixture.id]
        ).length;

        return (
          <section className="card" key={rule.id}>
            <h2>{rule.week_name}</h2>

            <p className="input-help">
              Pick {rule.required_picks} team
              {rule.required_picks === 1 ? "" : "s"}. Selected:{" "}
              {selectedCount} / {rule.required_picks}
            </p>

            {weekFixtures.length === 0 ? (
              <p>No fixtures found for this week.</p>
            ) : (
              <div className="table-wrapper">
                <table className="fixtures-table">
                  <thead>
                    <tr>
                      <th>Date / time</th>
                      <th>Home pick</th>
                      <th>Fixture</th>
                      <th>Away pick</th>
                    </tr>
                  </thead>

                  <tbody>
                    {weekFixtures.map((fixture) => {
                      const selectedTeam =
                        selectedPicks[fixture.id];

                      const homeAlreadyUsed =
                        pickedTeams
                          .filter(
                            (team) =>
                              normalise(team) !==
                              normalise(selectedTeam)
                          )
                          .some(
                            (team) =>
                              normalise(team) ===
                              normalise(fixture.home_team)
                          );

                      const awayAlreadyUsed =
                        pickedTeams
                          .filter(
                            (team) =>
                              normalise(team) !==
                              normalise(selectedTeam)
                          )
                          .some(
                            (team) =>
                              normalise(team) ===
                              normalise(fixture.away_team)
                          );

                      return (
                        <tr key={fixture.id}>
                          <td>
                            {fixture.kickoff_at ??
                              fixture.fixture_label ??
                              ""}
                          </td>

                          <td>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  selectedTeam ===
                                  fixture.home_team
                                }
                                disabled={homeAlreadyUsed}
                                onChange={() =>
                                  updatePick(
                                    fixture.id,
                                    fixture.home_team
                                  )
                                }
                              />

                              {fixture.home_team}
                            </label>
                          </td>

                          <td>
                            {fixture.home_team} v {fixture.away_team}
                          </td>

                          <td>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  selectedTeam ===
                                  fixture.away_team
                                }
                                disabled={awayAlreadyUsed}
                                onChange={() =>
                                  updatePick(
                                    fixture.id,
                                    fixture.away_team
                                  )
                                }
                              />

                              {fixture.away_team}
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      <section className="card">
        {message && <p className="form-message">{message}</p>}

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Submitting..."
              : "Submit Last Man Standing entry"}
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={clearDraft}
          >
            Clear saved draft
          </button>
        </div>
      </section>
    </form>
  );
}