// Generates and persists a per-browser session identifier used to scope
// uploads and history entries to a single student (Requirement 7).
// No login is required for the MVP; this is intentionally simple.

const SESSION_STORAGE_KEY = "padhai_session_id";

/** Raised when a Session_Identity cannot be generated or persisted
 * (Requirement 7.3) - e.g. localStorage is unavailable (private/incognito
 * mode with storage disabled, storage quota exceeded, or non-browser
 * execution). Callers must block upload/save actions when this is thrown. */
export class SessionIdentityError extends Error {
  constructor() {
    super("Could not establish a session on this device.");
    this.name = "SessionIdentityError";
  }
}

/**
 * Returns the current session id, creating and persisting one on first call.
 * Must only be called in the browser (client components / effects).
 *
 * Throws SessionIdentityError (Requirement 7.3) if a Session_Identity
 * cannot be generated or persisted - callers must not silently proceed
 * without one, since History_Store writes/reads depend on it entirely.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    // Should never be read server-side; guard just in case a component
    // accidentally calls this during SSR.
    throw new SessionIdentityError();
  }

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage can throw (quota exceeded, disabled storage, some
    // private-browsing modes) - surface this as a session establishment
    // failure rather than letting requests go out with no session id.
    throw new SessionIdentityError();
  }
}

/**
 * Non-throwing check used by UI to decide whether to block upload/save
 * actions (Requirement 7.3) before the Student even attempts a request.
 */
export function hasSessionIdentity(): boolean {
  try {
    getOrCreateSessionId();
    return true;
  } catch {
    return false;
  }
}
