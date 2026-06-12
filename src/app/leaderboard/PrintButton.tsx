"use client";

export default function PrintButton() {
  return (
    <button
      className="secondary-button"
      type="button"
      onClick={() => window.print()}
    >
      Print leaderboard
    </button>
  );
}