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
      className="inline-flex rounded-lg border border-border bg-surface p-0.5"
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
            className={`flex min-h-touch min-w-touch items-center justify-center rounded-md px-3.5 text-sm font-semibold transition ${
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground"
            } disabled:opacity-50`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
