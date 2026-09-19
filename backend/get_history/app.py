"""
GetHistoryFn - GET /history

Lists saved Study_Results for the caller's session id, newest first. This
function only has dynamodb:Query on the history table (see design.md IAM
section) - it never calls Bedrock or S3.

Env vars (see backend/template.yaml):
  HISTORY_TABLE_NAME - DynamoDB table name for saved Study_Results
"""

import json
import logging
import os
import re
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

HISTORY_TABLE_NAME = os.environ.get("HISTORY_TABLE_NAME", "")
HISTORY_QUERY_LIMIT = 50

# Matches a Cognito IdentityId ("region:guid", max ~55 chars per AWS's
# GetId documentation) or a UUID v4 fallback (36 chars) - see _get_session_id.
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,36}(:[0-9a-fA-F-]{1,36})?$")

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
    # Session_Identity values are either a Cognito IdentityId ("region:guid",
    # e.g. "ap-south-1:23ec4050-6aea-7089-a2dd-08002example", per AWS's
    # documented format, max 55 chars) or a locally generated UUID v4
    # fallback (36 chars) when Cognito isn't configured. Bound the length
    # and character set to that shape rather than accepting an arbitrary
    # client-supplied string as a DynamoDB partition key.
    if not SESSION_ID_PATTERN.match(session_id):
        raise ValidationError("X-Session-Id header is not a valid session identifier.")
    return session_id


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    try:
        session_id = _get_session_id(event.get("headers", {}))
    except ValidationError as exc:
        return _response(400, {"error": "invalid_request", "message": str(exc)})

    if not HISTORY_TABLE_NAME:
        logger.error("HISTORY_TABLE_NAME is not configured.")
        return _response(500, {"error": "history_unavailable"})

    try:
        table = _dynamodb.Table(HISTORY_TABLE_NAME)
        result = table.query(
            KeyConditionExpression=Key("sessionId").eq(session_id),
            ScanIndexForward=False,  # newest first (sortKey starts with ISO timestamp)
            Limit=HISTORY_QUERY_LIMIT,
        )
    except (BotoCoreError, ClientError):
        logger.exception("Failed to query history for session %s", session_id)
        return _response(500, {"error": "history_unavailable"})

    items = [
        {
            "id": entry.get("id"),
            "createdAt": entry.get("createdAt"),
            "label": entry.get("label"),
            "language": entry.get("language"),
            "explanation": entry.get("explanation"),
            "questions": entry.get("questions", []),
            "revisionSuggestion": entry.get("revisionSuggestion"),
        }
        for entry in result.get("Items", [])
    ]

    return _response(200, {"items": items})
