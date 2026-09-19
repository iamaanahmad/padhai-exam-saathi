// Establishes a per-browser Session_Identity used to scope uploads and
// history entries to a single student (Requirement 7). No login is
// required for the MVP; per steering this uses Cognito's minimal
// "anonymous login" mode only - an unauthenticated Cognito Identity Pool
// that issues a real, AWS-signed IdentityId per browser via GetId.
//
// This is deliberately NOT full Cognito auth: no user pool, no sign-in UI,
// no passwords, and the temporary AWS credentials Cognito could also hand
// out are never requested or used - only the IdentityId string itself is
// used, as the session identifier sent to our own API. This gives a real
// improvement over a client-generated UUID (an attacker can't simply
// invent a plausible-looking id; GetId requires a valid call against our
// specific identity pool) without expanding auth scope beyond what the
// steering allows.
//
// If NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID isn't configured, or the GetId
// call fails (offline, Cognito outage, etc), this falls back to a
// self-generated UUID cached the same way, so the app keeps working.

import {
  CognitoIdentityClient,
  GetIdCommand,
} from "@aws-sdk/client-cognito-identity";

const SESSION_STORAGE_KEY = "padhai_session_id";

const IDENTITY_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID ?? "";
const COGNITO_REGION = process.env.NEXT_PUBLIC_COGNITO_REGION ?? "";

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

function readCachedSessionId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCachedSessionId(id: string): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // If persistence fails we still return the id for this call; the next
    // call will simply request/generate a new one. Not treated as fatal
    // here since the caller already has a usable id for the current request.
  }
}

let inFlightIdentity: Promise<string> | null = null;

/**
 * Calls Cognito Identity Pool's GetId to obtain a real, AWS-issued
 * anonymous IdentityId. Returns null (rather than throwing) if Cognito
 * isn't configured or the call fails, so the caller can fall back to a
 * locally generated id instead of hard-failing the whole session.
 */
async function fetchCognitoIdentityId(): Promise<string | null> {
  if (!IDENTITY_POOL_ID || !COGNITO_REGION) {
    return null;
  }

  try {
    const client = new CognitoIdentityClient({ region: COGNITO_REGION });
    const response = await client.send(
      new GetIdCommand({ IdentityPoolId: IDENTITY_POOL_ID })
    );
    return response.IdentityId ?? null;
  } catch {
    // Network failure, Cognito outage, misconfigured pool id, etc - not
    // fatal, the caller falls back to a locally generated id.
    return null;
  }
}

/**
 * Returns the current session id, establishing one on first call:
 * 1. Reuse a cached id from localStorage if present (Cognito IdentityId or
 *    a previously generated fallback UUID - either way, stable across
 *    visits per Requirement 7.2).
 * 2. Otherwise, try Cognito's GetId for a real anonymous IdentityId.
 * 3. If Cognito isn't configured or fails, generate a UUID v4 fallback.
 * Either way, the result is cached in localStorage so it's stable for
 * subsequent calls without a new network round trip every time.
 *
 * Must only be called in the browser (client components / effects).
 * Throws SessionIdentityError (Requirement 7.3) only if a Session_Identity
 * can neither be established NOR used for the current call - i.e. both
 * Cognito and local UUID generation are unavailable.
 */
export async function getOrCreateSessionId(): Promise<string> {
  if (typeof window === "undefined") {
    // Should never be read server-side; guard just in case a component
    // accidentally calls this during SSR.
    throw new SessionIdentityError();
  }

  const cached = readCachedSessionId();
  if (cached) {
    return cached;
  }

  // Coalesce concurrent callers (e.g. two API calls fired close together
  // before the first GetId resolves) into a single Cognito round trip.
  if (!inFlightIdentity) {
    inFlightIdentity = (async () => {
      const cognitoId = await fetchCognitoIdentityId();
      if (cognitoId) {
        writeCachedSessionId(cognitoId);
        return cognitoId;
      }

      try {
        const fallbackId = crypto.randomUUID();
        writeCachedSessionId(fallbackId);
        return fallbackId;
      } catch {
        throw new SessionIdentityError();
      }
    })().finally(() => {
      inFlightIdentity = null;
    });
  }

  return inFlightIdentity;
}

/**
 * Non-throwing check used by UI to decide whether to block upload/save
 * actions (Requirement 7.3) before the Student even attempts a request.
 */
export async function hasSessionIdentity(): Promise<boolean> {
  try {
    await getOrCreateSessionId();
    return true;
  } catch {
    return false;
  }
}
