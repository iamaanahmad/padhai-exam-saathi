"use client";

import { useCallback, useEffect, useState } from "react";
import HistoryList from "@/components/HistoryList";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBanner from "@/components/ErrorBanner";
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
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Weak Topics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything you&apos;ve saved, newest first.
        </p>
      </div>

      {isLoading && <LoadingSpinner message="Loading your history..." />}

      {!isLoading && error && <ErrorBanner message={error} onRetry={load} />}

      {!isLoading && !error && items && items.length === 0 && (
        <div className="card text-center text-sm text-slate-500">
          You haven&apos;t saved any topics yet. Analyze something on the Home
          tab and tap &quot;Save to Weak Topics&quot;.
        </div>
      )}

      {!isLoading && !error && items && items.length > 0 && (
        <HistoryList items={items} />
      )}
    </div>
  );
}
