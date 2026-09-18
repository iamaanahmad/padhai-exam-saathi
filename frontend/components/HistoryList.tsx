"use client";

import { useState } from "react";
import type { HistoryItem } from "@/lib/types";
import { ChevronDownIcon, CompassIcon } from "./icons";

interface HistoryListProps {
  items: HistoryItem[];
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Weak Topics / History list with tap-to-expand detail (Requirement 6). */
export default function HistoryList({ items }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <li key={item.id} className="surface-block overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : item.id)}
              aria-expanded={expanded}
              className="flex min-h-touch w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatTimestamp(item.createdAt)} ·{" "}
                  {item.language === "hi" ? "हिंदी" : "English"}
                </p>
              </div>
              <ChevronDownIcon
                className={`h-4 w-4 flex-none text-muted transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {expanded && (
              <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                    Explanation
                  </h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {item.explanation}
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                    Practice questions
                  </h3>
                  <ol className="divide-y divide-border rounded-xl bg-background">
                    {item.questions.map((q, index) => (
                      <li key={index} className="p-3">
                        <p className="text-sm font-semibold text-foreground">
                          <span className="mr-1.5 text-muted">{index + 1}.</span>
                          {q.question}
                        </p>
                        <p className="mt-1 pl-5 text-sm leading-relaxed text-muted">
                          {q.answer}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-2.5 rounded-xl bg-accent/10 p-3">
                  <CompassIcon className="mt-0.5 h-4 w-4 flex-none text-accent" />
                  <p className="text-sm leading-relaxed text-foreground">
                    {item.revisionSuggestion}
                  </p>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
