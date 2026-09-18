"use client";

import { useCallback, useEffect, useState } from "react";
import HistoryList from "@/components/HistoryList";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBanner from "@/components/ErrorBanner";
import { BookmarkIcon } from "@/components/icons";
import { getHistory, ApiError } from "@/lib/api";
import type { HistoryItem } from "@/lib/types";

/** History screen: lists saved Study_Results for the current session. */
export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setItems(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "History could not be loaded. Please try again.";
      setError(message);
      setItems(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Your progress
        </p>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
          Weak topics
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
          Everything you&apos;ve saved, newest first.
        </p>
      </div>

      {isLoading && <LoadingSpinner message="Loading your history..." />}

      {!isLoading && error && <ErrorBanner message={error} onRetry={load} />}

      {!isLoading && !error && items && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookmarkIcon className="h-5 w-5" />
          </span>
          <p className="max-w-[16rem] text-sm leading-relaxed text-muted">
            You haven&apos;t saved any topics yet. Analyze something on the
            Home tab and tap <span className="font-semibold text-foreground">Save to Weak Topics</span>.
          </p>
        </div>
      )}

      {!isLoading && !error && items && items.length > 0 && (
        <HistoryList items={items} />
      )}
    </div>
  );
}
