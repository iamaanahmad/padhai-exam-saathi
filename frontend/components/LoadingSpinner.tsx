interface LoadingSpinnerProps {
  message?: string;
}

/** Loading state shown while waiting on the Bedrock-backed /analyze call. */
export default function LoadingSpinner({
  message = "Reading your material...",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 py-10 text-center"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
