"use client";

import { useState } from "react";
import type { StudyResult } from "@/lib/types";
import { BookmarkIcon, CheckCircleIcon, CompassIcon } from "./icons";

interface ResultViewProps {
  result: StudyResult;
  onSave: () => Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Renders a Study_Result as distinct, mobile-friendly sections
 * (Requirement 4.1) with a save-to-history action (Requirement 5).
 *
 * The explanation flows as plain prose (it's the primary reading content,
 * not an independent interactive block, so it isn't boxed). The practice
 * questions get one bounded list with internal dividers rather than a card
 * per question. The revision suggestion is the one place the accent color
 * is used prominently, as a callout - "the thing to do next".
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
    <div className="flex flex-col gap-6 border-t border-border pt-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Explanation
        </h2>
        <p className="whitespace-pre-wrap text-[1.02rem] leading-relaxed text-foreground">
          {result.explanation}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Practice questions
        </h2>
        <ol className="surface-block divide-y divide-border">
          {result.questions.map((q, index) => (
            <li key={index} className="p-4">
              <p className="font-semibold text-foreground">
                <span className="mr-1.5 text-muted">{index + 1}.</span>
                {q.question}
              </p>
              <p className="mt-1.5 pl-5 text-sm leading-relaxed text-muted">{q.answer}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex gap-3 rounded-2xl bg-accent/10 p-4">
        <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CompassIcon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-accent-foreground/80">
            What to revise next
          </h2>
          <p className="text-[0.95rem] leading-relaxed text-foreground">
            {result.revisionSuggestion}
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saveState === "saving" || saveState === "saved"}
        className="btn-secondary"
      >
        {saveState === "saved" ? (
          <>
            <CheckCircleIcon className="h-4 w-4 text-success" />
            Saved to Weak Topics
          </>
        ) : saveState === "saving" ? (
          "Saving..."
        ) : (
          <>
            <BookmarkIcon className="h-4 w-4" />
            Save to Weak Topics
          </>
        )}
      </button>

      {saveState === "error" && (
        <p role="alert" className="text-sm font-medium text-danger">
          Save failed. Please try again.
        </p>
      )}
    </div>
  );
}
