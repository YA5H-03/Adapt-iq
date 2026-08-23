"""
quiz_service.py — Gemini AI quiz generation logic for AdaptIQ.

Responsibilities:
  1. Calculate a weakness score from user confidence + optional past quiz score.
  2. Decide question difficulty from the weakness score.
  3. Build a tight JSON-output prompt for Gemini.
  4. Call Gemini via the google-genai SDK, parse the JSON, retry once on failure.
"""

from __future__ import annotations

import json
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Weakness & difficulty helpers
# ---------------------------------------------------------------------------

_CONFIDENCE_WEIGHT: dict[str, float] = {
    "Low": 1.0,
    "Medium": 0.5,
    "High": 0.2,
}


def compute_weakness(
    confidence: str,
    quiz_score: float | None = None,
) -> float:
    """
    Returns a weakness score in [0, 1].
    Higher  ->  user needs more support  ->  easier questions.

    Cold-start (no prior quiz score): returns confidence weight directly.
    Warm (has a score): blends 70% quiz-performance + 30% confidence.
    """
    conf_factor = _CONFIDENCE_WEIGHT.get(confidence, 0.5)
    if quiz_score is None:
        return conf_factor  # cold start
    score_factor = 1.0 - (quiz_score / 100.0)
    return round(0.7 * score_factor + 0.3 * conf_factor, 4)


def get_difficulty(weakness: float) -> str:
    """Map weakness score to question difficulty label."""
    if weakness > 0.65:
        return "easy"
    if weakness < 0.40:
        return "hard"
    return "medium"


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(subject: str, module: str, difficulty: str, num_questions: int) -> str:
    return f"""You are an expert academic quiz generator for university-level students.

Generate exactly {num_questions} multiple-choice questions on the following topic.

Subject : {subject}
Module  : {module}
Difficulty: {difficulty}

Rules:
- Questions must be exam-oriented and conceptually accurate.
- Each question must have exactly 4 answer options labelled A, B, C, D.
- Exactly one option is correct.
- Avoid ambiguous or trick questions.
- Do NOT include explanations or extra commentary.

IMPORTANT: Respond with ONLY a valid JSON array and nothing else.
The JSON must follow this exact schema:
[
  {{
    "question": "Question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "answer": "A"
  }}
]

where "answer" is the letter (A, B, C, or D) of the correct option.
"""


# ---------------------------------------------------------------------------
# JSON extractor (strips markdown code fences Gemini sometimes adds)
# ---------------------------------------------------------------------------

def _extract_json(raw: str) -> str:
    cleaned = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip()
    start = cleaned.find("[")
    end = cleaned.rfind("]")
    if start != -1 and end != -1:
        return cleaned[start : end + 1]
    return cleaned


# ---------------------------------------------------------------------------
# Gemini API call with retry
# ---------------------------------------------------------------------------

def call_gemini(prompt: str, api_key: str, max_retries: int = 2) -> list[dict[str, Any]]:
    """
    Call Gemini and return a list of question dicts.
    Retries up to max_retries times on JSON parse failure.
    """
    from google import genai  # lazy import so missing key does not crash startup

    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            raw_text = response.text
            logger.debug("Gemini raw (attempt %d): %s", attempt, raw_text[:300])
            questions = json.loads(_extract_json(raw_text))
            if not isinstance(questions, list) or len(questions) == 0:
                raise ValueError("Gemini returned an empty or non-list response.")
            return questions
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini attempt %d failed: %s", attempt, exc)

    raise ValueError(f"Gemini failed after {max_retries} attempts: {last_error}")


# ---------------------------------------------------------------------------
# Answer-letter to 0-based index
# ---------------------------------------------------------------------------

_LETTER_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}


def letter_to_index(letter: str) -> int:
    return _LETTER_TO_INDEX.get(letter.strip().upper(), 0)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_quiz(
    subject: str,
    module: str,
    num_questions: int,
    confidence: str,
    quiz_score: float | None,
    api_key: str,
) -> dict[str, Any]:
    """Full pipeline: weakness -> difficulty -> prompt -> Gemini -> parsed questions."""
    weakness = compute_weakness(confidence, quiz_score)
    difficulty = get_difficulty(weakness)
    prompt = build_prompt(subject, module, difficulty, num_questions)
    raw_questions = call_gemini(prompt, api_key)

    questions = []
    for i, q in enumerate(raw_questions[:num_questions]):
        questions.append(
            {
                "id": i,
                "topic": module,
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correctAnswer": letter_to_index(q.get("answer", "A")),
            }
        )

    return {
        "difficulty": difficulty,
        "weakness": weakness,
        "questions": questions,
    }
