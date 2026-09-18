interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Inline, retry-able error banner used across upload/save/history flows. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-touch shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
