// Typed fetch wrappers for the PadhAI backend API. All requests attach the
// browser's session id so results can be scoped per-student without login.

import { getOrCreateSessionId, SessionIdentityError } from "./session";
import type { AnalyzeRequest, HistoryItem, StudyResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// Requirement 5.3: a history save must fail (with a retry option) if it
// doesn't complete within 5 seconds.
const SAVE_HISTORY_TIMEOUT_MS = 5000;

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  /** Optional client-side timeout in milliseconds (e.g. Requirement 5.3). */
  timeoutMs?: number;
}

async function request<T>(path: string, init: RequestOptions): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "missing_config",
      "API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL."
    );
  }

  let sessionId: string;
  try {
    sessionId = await getOrCreateSessionId();
  } catch (err) {
    if (err instanceof SessionIdentityError) {
      throw new ApiError("session_unavailable", err.message);
    }
    throw err;
  }

  const { timeoutMs, ...fetchInit } = init;
  const controller = new AbortController();
  const timeoutId = timeoutMs
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
        ...(fetchInit.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("timeout", "The request took too long. Please try again.");
    }
    // Network failure (offline, DNS, CORS, etc).
    throw new ApiError("network_error", "Could not reach the server.");
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let code = "unknown_error";
    try {
      const body = await response.json();
      if (typeof body?.error === "string") {
        code = body.error;
      }
    } catch {
      // ignore, fall through with generic code
    }

    if (response.status === 504 || code === "timeout") {
      throw new ApiError("timeout", "The request took too long. Please try again.");
    }
    throw new ApiError(code, "Something went wrong. Please try again.");
  }

  return (await response.json()) as T;
}

/** Calls POST /analyze and returns the generated Study_Result. */
export async function analyze(payload: AnalyzeRequest): Promise<StudyResult> {
  const data = await request<{ studyResult: StudyResult }>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.studyResult;
}

/** Calls POST /history to save a Study_Result to the student's history. */
export async function saveHistory(
  studyResult: StudyResult
): Promise<{ id: string; createdAt: string }> {
  return request("/history", {
    method: "POST",
    body: JSON.stringify({ studyResult }),
    timeoutMs: SAVE_HISTORY_TIMEOUT_MS,
  });
}

/** Calls GET /history and returns the student's saved Study_Results. */
export async function getHistory(): Promise<HistoryItem[]> {
  const data = await request<{ items: HistoryItem[] }>("/history", {
    method: "GET",
  });
  return data.items;
}
