"""Gemini generation and defensive output validation."""

from __future__ import annotations

import json
import logging
import re

from google import genai
from google.genai import types

from ..config import get_settings

logger = logging.getLogger(__name__)
ANSWER_LETTERS = {"A", "B", "C", "D"}

QUIZ_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "question": {"type": "string"},
            "options": {"type": "array", "items": {"type": "string"}},
            "answer": {"type": "string"},
            "concept": {"type": "string"},
        },
        "required": ["question", "options", "answer", "concept"],
    },
}


def _extract_quiz_payload(raw: str | list | dict) -> list:
    """Accept structured SDK output plus harmless common JSON wrappers."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        raw = raw.get("questions", raw.get("quiz", raw))
        if isinstance(raw, list):
            return raw
        raise ValueError("Gemini JSON object did not contain a questions array")
    if not isinstance(raw, str):
        raise ValueError("Gemini returned no quiz content")
    cleaned = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", raw.strip(), flags=re.IGNORECASE)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        # Some models prepend a short sentence despite the instruction. Extract
        # only a complete JSON array rather than treating the response as valid text.
        start, end = cleaned.find("["), cleaned.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("Gemini did not return valid JSON") from exc
        try:
            parsed = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError as nested_exc:
            raise ValueError("Gemini did not return valid JSON") from nested_exc
    if isinstance(parsed, dict):
        parsed = parsed.get("questions", parsed.get("quiz", parsed))
    if not isinstance(parsed, list):
        raise ValueError("Gemini response must contain a JSON array")
    return parsed


def _normalise_answer(answer: str, options: list[str]) -> str:
    """Map supported Gemini answer styles to the server's A/B/C/D format."""
    normalized = answer.strip()
    if normalized.upper() in ANSWER_LETTERS:
        return normalized.upper()
    option_match = re.fullmatch(r"(?:option\s*)?([A-Da-d])", normalized)
    if option_match:
        return option_match.group(1).upper()
    if normalized in options:
        return answerLetter(options.index(normalized))
    if normalized in {"1", "2", "3", "4"}:
        return answerLetter(int(normalized) - 1)
    raise ValueError("Every answer must identify one of the four options")


def answerLetter(index: int) -> str:
    return chr(65 + index)


def parse_and_validate_quiz(raw: str | list | dict, expected_count: int) -> list[dict]:
    questions = _extract_quiz_payload(raw)
    if not isinstance(questions, list) or len(questions) != expected_count:
        raise ValueError("Gemini returned an unexpected number of questions")
    validated = []
    seen = set()
    for index, item in enumerate(questions, start=1):
        if not isinstance(item, dict):
            raise ValueError("Every quiz entry must be an object")
        question, options, answer, concept = item.get("question"), item.get("options"), item.get("answer"), item.get("concept")
        if not all(isinstance(value, str) and value.strip() for value in (question, answer, concept)):
            raise ValueError("Quiz entries are missing required text fields")
        if not isinstance(options, list) or len(options) != 4 or any(not isinstance(option, str) or not option.strip() for option in options) or len(set(options)) != 4:
            raise ValueError("Every question must have exactly four distinct options")
        answer = _normalise_answer(answer, options)
        fingerprint = question.strip().lower()
        if fingerprint in seen:
            raise ValueError("Duplicate quiz questions are not allowed")
        seen.add(fingerprint)
        validated.append({"id": str(index), "question": question.strip(), "options": [option.strip() for option in options], "answer": answer, "concept": concept.strip()})
    return validated


def generate_quiz(prompt: str, num_questions: int) -> list[dict]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY on the backend.")
    client = genai.Client(api_key=settings.gemini_api_key)
    last_error = None
    for attempt in range(2):
        try:
            logger.info("Requesting Gemini adaptive quiz (attempt %s)", attempt + 1)
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=QUIZ_SCHEMA),
            )
            # Newer SDK versions expose parsed JSON while older versions expose
            # response.text. Supporting both prevents a valid structured reply
            # from being discarded due to an SDK representation difference.
            payload = getattr(response, "parsed", None)
            return parse_and_validate_quiz(payload if payload is not None else (response.text or ""), num_questions)
        except Exception as exc:  # provider and malformed-response errors are retried once
            last_error = exc
            logger.warning("Adaptive quiz generation attempt %s failed validation/provider call: %s", attempt + 1, exc)
    if isinstance(last_error, ValueError):
        raise RuntimeError("Gemini returned an invalid quiz twice. Please try again; details are in the backend log.") from last_error
    raise RuntimeError("Gemini request failed. Check the backend log and GEMINI_API_KEY/model configuration.") from last_error


def public_questions(questions: list[dict]) -> list[dict]:
    return [{key: item[key] for key in ("id", "question", "options", "concept")} for item in questions]


def generate_recommendation(prompt: str) -> str:
    """Generate a free-text study recommendation using the existing Gemini client.

    Unlike ``generate_quiz`` this function expects plain natural language output,
    not structured JSON.  It shares the same API key, model, and client
    initialisation as the quiz generator.

    Parameters
    ----------
    prompt:
        The fully-built prompt from ``build_recommendation_prompt``.

    Returns
    -------
    str
        The generated recommendation text from Gemini.

    Raises
    ------
    RuntimeError
        If the Gemini API key is missing, the request fails, or the response
        contains no usable text.
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY on the backend.")
    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        logger.info("Requesting Gemini study recommendation")
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
        )
        text = (response.text or "").strip()
        if not text:
            raise RuntimeError("Gemini returned an empty recommendation.")
        logger.info("Gemini recommendation generated (%d chars)", len(text))
        return text
    except RuntimeError:
        raise
    except Exception as exc:
        logger.warning("Gemini recommendation request failed: %s", exc)
        raise RuntimeError(
            "Gemini recommendation request failed. Check GEMINI_API_KEY/model configuration."
        ) from exc

