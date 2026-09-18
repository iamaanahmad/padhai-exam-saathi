"use client";

import { useState } from "react";
import type { StudyResult } from "@/lib/types";

interface ResultViewProps {
  result: StudyResult;
  onSave: () => Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Renders a Study_Result as distinct, mobile-friendly sections
 * (Requirement 4.1) with a save-to-history action (Requirement 5).
 */
export default function ResultView({ result, onSave }: ResultViewProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function handleSave() {
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-600">
          Explanation
        </h2>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">
          {result.explanation}
        </p>
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-600">
          Practice Questions
        </h2>
        <ol className="flex flex-col gap-4">
          {result.questions.map((q, index) => (
            <li key={index} className="rounded-xl bg-slate-50 p-3">
              <p className="font-medium text-slate-900">
                {index + 1}. {q.question}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-semibold text-emerald-700">Answer: </span>
                {q.answer}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card border-saffron-500/40 bg-saffron-400/5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-saffron-500">
          What to revise next
        </h2>
        <p className="text-base leading-relaxed text-slate-800">
          {result.revisionSuggestion}
        </p>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saveState === "saving" || saveState === "saved"}
        className="btn-secondary"
      >
        {saveState === "saved"
          ? "Saved to Weak Topics ✓"
          : saveState === "saving"
            ? "Saving..."
            : "Save to Weak Topics"}
      </button>

      {saveState === "error" && (
        <p role="alert" className="text-sm font-medium text-red-600">
          Save failed. Please try again.
        </p>
      )}
    </div>
  );
}
