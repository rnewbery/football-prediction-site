"use client";

export default function PrintSheetButton() {
  return (
    <button type="button" onClick={() => window.print()}>
      Print prediction sheet
    </button>
  );
}