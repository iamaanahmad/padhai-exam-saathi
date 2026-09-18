"""
SaveHistoryFn - POST /history

Persists a Study_Result (already generated via /analyze) to DynamoDB under
the caller's session id. This function only has dynamodb:PutItem on the
history table (see design.md IAM section) - it never calls Bedrock or S3.

Env vars (see backend/template.yaml):
  HISTORY_TABLE_NAME - DynamoDB table name for saved Study_Results
"""

import base64
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

HISTORY_TABLE_NAME = os.environ.get("HISTORY_TABLE_NAME", "")
ACCEPTED_LANGUAGES = {"en", "hi"}
LABEL_MAX_CHARS = 60

_dynamodb = boto3.resource("dynamodb")


class ValidationError(Exception):
    """Raised for client-input problems; maps to an HTTP 400 response."""


def _response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _get_session_id(headers: dict[str, str]) -> str:
    normalized = {k.lower(): v for k, v in (headers or {}).items()}
    session_id = normalized.get("x-session-id")
    if not session_id:
        raise ValidationError("Missing X-Session-Id header.")
    return session_id


def _validate_study_result(study_result: Any) -> dict[str, Any]:
    if not isinstance(study_result, dict):
        raise ValidationError("studyResult is required.")

    explanation = study_result.get("explanation")
    questions = study_result.get("questions")
    revision_suggestion = study_result.get("revisionSuggestion")
    language = study_result.get("language")

    if not isinstance(explanation, str) or not explanation:
        raise ValidationError("studyResult.explanation is required.")
    if not isinstance(questions, list):
        raise ValidationError("studyResult.questions is required.")
    if not isinstance(revision_suggestion, str) or not revision_suggestion:
        raise ValidationError("studyResult.revisionSuggestion is required.")
    if language not in ACCEPTED_LANGUAGES:
        raise ValidationError("studyResult.language must be 'en' or 'hi'.")

    clean_questions = []
    for item in questions:
        if (
            isinstance(item, dict)
            and isinstance(item.get("question"), str)
            and isinstance(item.get("answer"), str)
        ):
            clean_questions.append({"question": item["question"], "answer": item["answer"]})

    return {
        "explanation": explanation,
        "questions": clean_questions,
        "revisionSuggestion": revision_suggestion,
        "language": language,
    }


def _derive_label(explanation: str) -> str:
    label = explanation.strip().replace("\n", " ")
    if len(label) <= LABEL_MAX_CHARS:
        return label
    return label[:LABEL_MAX_CHARS].rstrip() + "..."


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    try:
        session_id = _get_session_id(event.get("headers", {}))
    except ValidationError as exc:
        return _response(400, {"error": "invalid_request", "message": str(exc)})

    try:
        raw_body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        body = json.loads(raw_body)
    except (json.JSONDecodeError, ValueError, UnicodeDecodeError):
        return _response(400, {"error": "invalid_request", "message": "Body must be valid JSON."})

    try:
        study_result = _validate_study_result(body.get("studyResult"))
    except ValidationError as exc:
        return _response(400, {"error": "invalid_request", "message": str(exc)})

    if not HISTORY_TABLE_NAME:
        logger.error("HISTORY_TABLE_NAME is not configured.")
        return _response(500, {"error": "save_failed"})

    item_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    sort_key = f"{created_at}#{item_id}"

    item = {
        "sessionId": session_id,
        "sortKey": sort_key,
        "id": item_id,
        "createdAt": created_at,
        "language": study_result["language"],
        "label": _derive_label(study_result["explanation"]),
        "explanation": study_result["explanation"],
        "questions": study_result["questions"],
        "revisionSuggestion": study_result["revisionSuggestion"],
    }

    try:
        table = _dynamodb.Table(HISTORY_TABLE_NAME)
        table.put_item(Item=item)
    except (BotoCoreError, ClientError):
        logger.exception("Failed to save history item for session %s", session_id)
        return _response(500, {"error": "save_failed"})

    return _response(201, {"id": item_id, "createdAt": created_at})
