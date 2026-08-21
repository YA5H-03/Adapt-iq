"""Prompt construction is deliberately kept out of HTTP routes."""


def build_adaptive_quiz_prompt(
    *,
    subject: str,
    module: str,
    num_questions: int,
    performance: dict,
    difficulty: str,
) -> str:
    """Build the structured Gemini prompt for an adaptive quiz."""

    first_attempt = performance["attempt_count"] == 0

    if first_attempt:
        performance_context = (
            "This is the student's first quiz for this module. There is no "
            "previous performance data. Generate a balanced diagnostic quiz "
            "at an appropriate introductory/medium level based on the "
            "selected confidence."
        )
    else:
        performance_context = (
            f"Previous score: {performance['previous_score']}%. "
            f"Current score: {performance['current_score']}%. "
            f"Average score: {performance['average_score']}%. "
            f"Performance level: {performance['performance_level']}. "
            f"Trend: {performance['trend']}. "
            f"Attempts: {performance['attempt_count']}."
        )

    weak_areas = ", ".join(performance.get("weak_areas", []))
    if not weak_areas:
        weak_areas = "None identified yet"

    return f"""Generate an adaptive study quiz.

Return ONLY a valid JSON array.
Do not return markdown, code fences, explanations, or extra text.

Student context:
- Subject: {subject}
- Module: {module}
- Questions requested: {num_questions}
- Self-reported confidence: {performance["confidence"]}

Performance context:
{performance_context}
- Weak areas: {weak_areas}

Adaptive instruction:
- Selected difficulty: {difficulty}.
- Actual quiz performance is the primary signal.
- Confidence is supporting context and must not override actual performance.
- Use gradual difficulty changes.
- Include weak areas when present while still covering the broader module.
- Keep questions exam-oriented and appropriate for the selected difficulty.

Question requirements:
- Generate exactly {num_questions} distinct questions.
- Every question must be related to {module} in {subject}.
- Every question must have exactly four distinct options.
- Every question must have exactly one correct answer.
- Avoid ambiguous wording.
- Avoid duplicate questions.
- Add application-based questions for medium, medium-hard, and hard difficulty.

Use this exact JSON structure:

[
  {{
    "question": "Question text",
    "options": [
      "Option A text",
      "Option B text",
      "Option C text",
      "Option D text"
    ],
    "answer": "A",
    "concept": "Short concept label"
  }}
]

Rules:
- "answer" must only be A, B, C, or D.
- "concept" should identify the concept tested, such as "AVL rotations".
- Return exactly {num_questions} JSON objects.
"""