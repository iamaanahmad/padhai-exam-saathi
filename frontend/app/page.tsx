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
      setResult(null);
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Turn any page into a lesson
        </h1>
        <p className="mt-1 text-sm text-slate-500">
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

      {!isSubmitting && !error && result && (
        <ResultView result={result} onSave={handleSave} />
      )}
    </div>
  );
}
