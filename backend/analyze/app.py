"""
AnalyzeFn - POST /analyze

Accepts an uploaded image (base64) or pasted text plus a language choice,
stores any image in S3, calls Amazon Bedrock to generate a structured
Study_Result (explanation + practice questions + revision suggestion), and
returns it. This function never touches DynamoDB (see design.md for the
least-privilege rationale).

Env vars (see backend/template.yaml):
  BEDROCK_MODEL_ID  - Bedrock model id, e.g. "anthropic.claude-3-5-sonnet-20241022-v2:0"
  BEDROCK_REGION    - Region to call Bedrock in (may differ from Lambda's region)
  UPLOAD_BUCKET_NAME - S3 bucket for temporary image storage
"""

import base64
import binascii
import json
import logging
import os
import re
import uuid
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError, ReadTimeoutError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB, mirrors Requirement 1.4
MIN_TEXT_CHARS = 1  # mirrors Requirement 1.6
MAX_TEXT_CHARS = 5000  # mirrors Requirement 1.6
ACCEPTED_IMAGE_MEDIA_TYPES = {"image/jpeg": "jpeg", "image/png": "png"}
ACCEPTED_LANGUAGES = {"en": "English", "hi": "Hindi"}

# Matches a Cognito IdentityId ("region:guid", max ~55 chars per AWS's
# GetId documentation) or a UUID v4 fallback (36 chars) - see _get_session_id.
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,36}(:[0-9a-fA-F-]{1,36})?$")

# Requirement 2.2 word-count ceilings on the parsed Study_Result.
MAX_EXPLANATION_WORDS = 300
MAX_ANSWER_WORDS = 50
MAX_REVISION_WORDS = 50

BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "")
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))
UPLOAD_BUCKET_NAME = os.environ.get("UPLOAD_BUCKET_NAME", "")

# Real vision requests against actual handwritten notes/textbook photos
# take meaningfully longer than the toy text-only prompts this was first
# tuned against - observed live: 15-17s for a real notes photo, cut off by
# an earlier, too-tight 15s read_timeout. API Gateway (HTTP API) hard-caps
# integration timeouts at 30s and this cannot be raised, so 24s is the
# practical ceiling for the Bedrock call itself: it leaves ~5s of the
# Lambda's 29s timeout (see template.yaml) for S3 write/delete, JSON
# parsing, and cold-start/init overhead, while still giving Bedrock enough
# room to actually finish a real vision request before the Gateway would
# cut the connection anyway. If Bedrock still doesn't respond within this
# budget, we shape a graceful {"error": "timeout"} response (Req 2.8)
# rather than being hard-killed by API Gateway with a bare 504.
_bedrock_config = Config(
    region_name=BEDROCK_REGION,
    read_timeout=24,
    connect_timeout=3,
    retries={"max_attempts": 0},
)
_bedrock_client = boto3.client("bedrock-runtime", config=_bedrock_config)
_s3_client = boto3.client("s3")

SYSTEM_PROMPT_TEMPLATE = """You are ExamSaathi, an expert, patient tutor for Indian students preparing for
board exams (Classes 10-12), JEE, NEET, and university courses. You read a
photo of a textbook page, a photo of handwritten notes, or a typed question,
and you produce a study aid.

Always respond in {language_name}. If asked for Hindi, use simple,
conversational Hindi (Devanagari script) mixed with common English technical
terms the way Indian students actually study (Hinglish register is fine for
technical terms, e.g. "photosynthesis", "acceleration").

Rules:
- Base your explanation only on the concept(s) actually present in the
  provided material. If handwriting or image quality makes something
  illegible, make a reasonable best-effort interpretation and proceed; never
  refuse and never say the image is unreadable unless it is truly blank or
  unrelated to academics.
- Explanation must be simple enough for a student who found the original
  material confusing: short sentences, everyday analogies, no unexplained
  jargon. Keep it to at most 300 words.
- Practice questions must test the SAME concept from different angles
  (not copies of the original question), at a similar difficulty level.
- Each answer must be short (1-3 sentences, at most 50 words), correct, and
  directly usable for self-checking.
- The revision suggestion must be one concrete, actionable next step
  (a specific sub-topic, formula, or type of problem to practice), not
  generic advice like "study more". Keep it to at most 50 words.
- If the uploaded material is not clearly academic content (e.g. an unrelated
  photo), still produce a best-effort explanation of whatever subject matter
  is closest to what's visible, plus 3-5 general study-skill or subject-entry
  practice questions related to it, and a revision suggestion pointing the
  student to upload a clearer textbook page, notes, or question next time.
  Every response must always include between 3 and 5 practice questions.

Output ONLY valid JSON matching exactly this shape, no markdown fences, no
extra commentary before or after:
{{
  "explanation": "string",
  "questions": [
    {{"question": "string", "answer": "string"}}
  ],
  "revisionSuggestion": "string"
}}
The "questions" array must contain between 3 and 5 items."""


class ValidationError(Exception):
    """Raised for client-input problems; maps to an HTTP 400 response."""


def _response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _get_session_id(headers: dict[str, str]) -> str:
    # API Gateway HTTP API lower-cases header names in the event payload.
    normalized = {k.lower(): v for k, v in (headers or {}).items()}
    session_id = normalized.get("x-session-id")
    if not session_id:
        raise ValidationError("Missing X-Session-Id header.")
    if not SESSION_ID_PATTERN.match(session_id):
        raise ValidationError("X-Session-Id header is not a valid session identifier.")
    return session_id


def _validate_and_extract(body: dict[str, Any]) -> dict[str, Any]:
    mode = body.get("mode")
    language = body.get("language")

    if language not in ACCEPTED_LANGUAGES:
        raise ValidationError("language must be 'en' or 'hi'.")

    if mode == "text":
        text = (body.get("text") or "").strip()
        if len(text) < MIN_TEXT_CHARS:
            raise ValidationError("text must not be empty.")
        if len(text) > MAX_TEXT_CHARS:
            raise ValidationError(f"text must be at most {MAX_TEXT_CHARS} characters.")
        return {"mode": "text", "text": text, "language": language}

    if mode == "image":
        media_type = body.get("imageMediaType")
        if media_type not in ACCEPTED_IMAGE_MEDIA_TYPES:
            raise ValidationError("imageMediaType must be image/jpeg or image/png.")

        raw_base64 = body.get("imageBase64")
        if not raw_base64:
            raise ValidationError("imageBase64 is required for image uploads.")

        try:
            image_bytes = base64.b64decode(raw_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValidationError("imageBase64 is not valid base64.") from exc

        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise ValidationError("Image must be at most 10 MB.")
        if len(image_bytes) == 0:
            raise ValidationError("Image data is empty.")

        return {
            "mode": "image",
            "image_bytes": image_bytes,
            "image_format": ACCEPTED_IMAGE_MEDIA_TYPES[media_type],
            "language": language,
        }

    raise ValidationError("mode must be 'text' or 'image'.")


class ImageStoreError(Exception):
    """Raised when the Image_Store write fails; per Requirement 3.2 this
    must block the Bedrock invocation entirely (no partial object, no
    analysis attempt on unpersisted material)."""


def _store_image(session_id: str, image_bytes: bytes, image_format: str) -> str | None:
    """Persists the uploaded image to S3 before analysis (Requirement 3.1).

    Returns the object key on success so the caller can delete it once
    processing finishes (Requirement 3.4). Raises ImageStoreError on
    failure - the caller must NOT proceed to invoke Bedrock in that case
    (Requirement 3.2), and no partial object is left behind since
    put_object either fully succeeds or raises.
    """
    if not UPLOAD_BUCKET_NAME:
        logger.warning("UPLOAD_BUCKET_NAME not set; skipping S3 storage of upload.")
        return None

    key = f"uploads/{session_id}/{uuid.uuid4()}.{image_format}"
    try:
        _s3_client.put_object(
            Bucket=UPLOAD_BUCKET_NAME,
            Key=key,
            Body=image_bytes,
            ContentType=f"image/{image_format}",
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Failed to store uploaded image in S3 (key=%s)", key)
        raise ImageStoreError("Could not save the uploaded image.") from exc

    return key


def _delete_image(key: str) -> None:
    """Best-effort delete of the temp upload object once processing finishes
    (Requirement 3.4), independent of the bucket's 24h lifecycle rule
    (Requirement 3.3). A delete failure here is logged, not surfaced to the
    student - the lifecycle rule remains as a backstop."""
    if not UPLOAD_BUCKET_NAME:
        return
    try:
        _s3_client.delete_object(Bucket=UPLOAD_BUCKET_NAME, Key=key)
    except (BotoCoreError, ClientError):
        logger.exception("Failed to delete temp upload object (key=%s)", key)


def _build_converse_request(parsed: dict[str, Any]) -> dict[str, Any]:
    language_name = ACCEPTED_LANGUAGES[parsed["language"]]
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(language_name=language_name)

    if parsed["mode"] == "image":
        content = [
            {
                "image": {
                    "format": parsed["image_format"],
                    "source": {"bytes": parsed["image_bytes"]},
                }
            },
            {
                "text": (
                    "Here is my textbook page or notes. Explain the concept "
                    "and help me practice."
                )
            },
        ]
    else:
        content = [
            {
                "text": (
                    "Here is my question or notes:\n\n"
                    f"{parsed['text']}\n\n"
                    "Explain the concept and help me practice."
                )
            }
        ]

    return {
        "modelId": BEDROCK_MODEL_ID,
        "system": [{"text": system_prompt}],
        "messages": [{"role": "user", "content": content}],
        # Sized to comfortably cover the actual output ceiling (300-word
        # explanation + 5 x 50-word answers + 50-word revision suggestion
        # is ~650 words, roughly 900 tokens for English; Hindi/Devanagari
        # commonly tokenizes at a higher ratio, hence the buffer) rather
        # than the previous 2000, which gave the model room to run well
        # past what we actually keep - and directly added to generation
        # latency, a real contributor to hitting the timeout on image
        # requests.
        "inferenceConfig": {"maxTokens": 1200, "temperature": 0.4},
    }


def _truncate_words(text: str, max_words: int) -> str:
    """Enforces a word-count ceiling (Requirement 2.2) as a hard guarantee,
    independent of whether the model actually honored the prompt's limit."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


def _parse_model_output(raw_text: str) -> dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        # Strip accidental markdown code fences the model may add despite
        # instructions, e.g. ```json ... ```.
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()

    data = json.loads(text)

    explanation = data.get("explanation")
    questions = data.get("questions")
    revision_suggestion = data.get("revisionSuggestion")

    if not isinstance(explanation, str) or not explanation:
        raise ValueError("Missing or invalid 'explanation'.")
    if not isinstance(questions, list):
        raise ValueError("Missing or invalid 'questions'.")
    if not isinstance(revision_suggestion, str) or not revision_suggestion:
        raise ValueError("Missing or invalid 'revisionSuggestion'.")

    clean_questions = []
    for item in questions:
        if (
            isinstance(item, dict)
            and isinstance(item.get("question"), str)
            and isinstance(item.get("answer"), str)
        ):
            clean_questions.append(
                {
                    "question": item["question"],
                    "answer": _truncate_words(item["answer"], MAX_ANSWER_WORDS),
                }
            )

    if not (3 <= len(clean_questions) <= 5):
        raise ValueError("questions must contain between 3 and 5 items.")

    return {
        "explanation": _truncate_words(explanation, MAX_EXPLANATION_WORDS),
        "questions": clean_questions,
        "revisionSuggestion": _truncate_words(revision_suggestion, MAX_REVISION_WORDS),
    }


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
        parsed = _validate_and_extract(body)
    except ValidationError as exc:
        return _response(400, {"error": "invalid_request", "message": str(exc)})

    if not BEDROCK_MODEL_ID:
        logger.error("BEDROCK_MODEL_ID is not configured.")
        return _response(502, {"error": "analysis_failed"})

    image_key: str | None = None
    if parsed["mode"] == "image":
        try:
            image_key = _store_image(session_id, parsed["image_bytes"], parsed["image_format"])
        except ImageStoreError:
            # Requirement 3.2: do not invoke Bedrock if the image couldn't
            # be persisted.
            return _response(502, {"error": "image_store_failed"})

    try:
        converse_request = _build_converse_request(parsed)

        try:
            response = _bedrock_client.converse(**converse_request)
        except _bedrock_client.exceptions.ModelTimeoutException:
            logger.warning("Bedrock model timed out for session %s", session_id)
            return _response(504, {"error": "timeout"})
        except ReadTimeoutError:
            # Client-side (botocore) read timeout - the SDK gave up waiting
            # on the HTTP response before Bedrock's own timeout fired.
            logger.warning("Bedrock read timeout for session %s", session_id)
            return _response(504, {"error": "timeout"})
        except (BotoCoreError, ClientError):
            logger.exception("Bedrock call failed for session %s", session_id)
            return _response(502, {"error": "analysis_failed"})

        try:
            content_blocks = response["output"]["message"]["content"]
            raw_text = next(block["text"] for block in content_blocks if "text" in block)
            study_result_data = _parse_model_output(raw_text)
        except (KeyError, IndexError, StopIteration, ValueError, json.JSONDecodeError):
            logger.exception("Failed to parse Bedrock response for session %s", session_id)
            return _response(502, {"error": "analysis_failed"})

        study_result_data["language"] = parsed["language"]
        return _response(200, {"studyResult": study_result_data})
    finally:
        # Requirement 3.4: delete the temp upload regardless of outcome,
        # independent of the bucket's lifecycle rule.
        if image_key:
            _delete_image(image_key)
