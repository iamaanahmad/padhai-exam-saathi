// Generates and persists a per-browser session identifier used to scope
// uploads and history entries to a single student (Requirement 7).
// No login is required for the MVP; this is intentionally simple.

const SESSION_STORAGE_KEY = "padhai_session_id";

/**
 * Returns the current session id, creating and persisting one on first call.
 * Must only be called in the browser (client components / effects).
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    // Should never be read server-side; guard just in case a component
    // accidentally calls this during SSR.
    return "server";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}
