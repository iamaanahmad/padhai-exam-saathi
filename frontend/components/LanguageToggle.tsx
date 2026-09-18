"use client";

import type { Language } from "@/lib/types";

interface LanguageToggleProps {
  value: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
}

/**
 * Simple English/Hindi toggle. Defaults to English per Requirement 1.7.
 */
export default function LanguageToggle({
  value,
  onChange,
  disabled,
}: LanguageToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose language"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-1"
    >
      {(
        [
          { code: "en" as const, label: "English" },
          { code: "hi" as const, label: "हिंदी" },
        ]
      ).map((option) => {
        const selected = value === option.code;
        return (
          <button
            key={option.code}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.code)}
            className={`min-h-touch rounded-lg px-4 py-2 text-sm font-semibold transition ${
              selected
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            } disabled:opacity-50`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
