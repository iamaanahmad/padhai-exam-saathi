"use client";

import { useState } from "react";
import type { HistoryItem } from "@/lib/types";

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
          <li key={item.id} className="card">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : item.id)}
              aria-expanded={expanded}
              className="min-h-touch flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-400">
                  {formatTimestamp(item.createdAt)} ·{" "}
                  {item.language === "hi" ? "हिंदी" : "English"}
                </p>
              </div>
              <span className="text-brand-600" aria-hidden="true">
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded && (
              <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Explanation
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {item.explanation}
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    Practice Questions
                  </h3>
                  <ol className="flex flex-col gap-2">
                    {item.questions.map((q, index) => (
                      <li key={index} className="rounded-lg bg-slate-50 p-2 text-sm">
                        <p className="font-medium text-slate-800">
                          {index + 1}. {q.question}
                        </p>
                        <p className="mt-1 text-slate-600">
                          <span className="font-semibold text-emerald-700">
                            Answer:{" "}
                          </span>
                          {q.answer}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-saffron-500">
                    What to revise next
                  </h3>
                  <p className="text-sm text-slate-700">{item.revisionSuggestion}</p>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
