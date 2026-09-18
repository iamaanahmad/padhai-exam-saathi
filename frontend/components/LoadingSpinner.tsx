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
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-muted">{message}</p>
    </div>
  );
}
