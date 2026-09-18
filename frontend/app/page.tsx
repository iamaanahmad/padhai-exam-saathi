"use client";

import { useCallback, useState } from "react";
import UploadForm from "@/components/UploadForm";
import ResultView from "@/components/ResultView";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBanner from "@/components/ErrorBanner";
import { analyze, saveHistory, ApiError } from "@/lib/api";
import type { AnalyzeRequest, Language, StudyResult } from "@/lib/types";

/**
 * Home screen: upload + result flow. Keeps the last submitted payload so a
 * language change or a failed request can be retried without re-uploading.
 */
export default function HomePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [lastPayload, setLastPayload] = useState<AnalyzeRequest | null>(null);
  const [result, setResult] = useState<StudyResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalyze = useCallback(async (payload: AnalyzeRequest) => {
    setIsSubmitting(true);
    setError(null);
    setLastPayload(payload);
    try {
      const studyResult = await analyze(payload);
      setResult(studyResult);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "We couldn't analyze that. Please try again.";
      setError(message);
      // Requirement 4.4: retain the previously displayed Study_Result (if
      // any) rather than clearing it on a failed retry or language switch -
      // the Student shouldn't lose a good result because a follow-up
      // request failed.
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  function handleSubmit(payload: AnalyzeRequest) {
    void runAnalyze(payload);
  }

  function handleRetry() {
    if (lastPayload) {
      void runAnalyze(lastPayload);
    }
  }

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    // Requirement 4.3: changing language after a result exists re-requests
    // the analysis in the newly selected language using the same input.
    if (lastPayload) {
      void runAnalyze({ ...lastPayload, language: next });
    }
  }

  async function handleSave() {
    if (!result) return;
    await saveHistory(result);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Explain & Practice
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
          Turn any page into a lesson
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
          Upload a photo of your textbook or notes, or paste a question. Get a
          simple explanation, practice questions, and what to revise next.
        </p>
      </div>

      <UploadForm
        language={language}
        onLanguageChange={handleLanguageChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {isSubmitting && <LoadingSpinner />}

      {!isSubmitting && error && (
        <ErrorBanner message={error} onRetry={lastPayload ? handleRetry : undefined} />
      )}

      {/* Requirement 4.4: a previously displayed Study_Result stays visible
          even if a later request (retry, language switch) fails - it is
          only replaced once a new Study_Result successfully arrives. */}
      {!isSubmitting && result && (
        <ResultView key={result.language} result={result} onSave={handleSave} />
      )}
    </div>
  );
}
