import { AlertIcon } from "./icons";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Inline, retry-able error banner used across upload/save/history flows. */
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <AlertIcon className="mt-0.5 h-4 w-4 flex-none text-danger" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-touch shrink-0 rounded-lg border border-danger/30 bg-surface px-4 text-sm font-semibold text-danger transition hover:bg-danger/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
