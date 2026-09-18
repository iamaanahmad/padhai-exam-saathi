// Typed fetch wrappers for the PadhAI backend API. All requests attach the
// browser's session id so results can be scoped per-student without login.

import { getOrCreateSessionId } from "./session";
import type { AnalyzeRequest, HistoryItem, StudyResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "missing_config",
      "API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL."
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // Network failure (offline, DNS, CORS, etc).
    throw new ApiError("network_error", "Could not reach the server.");
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
  });
}

/** Calls GET /history and returns the student's saved Study_Results. */
export async function getHistory(): Promise<HistoryItem[]> {
  const data = await request<{ items: HistoryItem[] }>("/history", {
    method: "GET",
  });
  return data.items;
}
