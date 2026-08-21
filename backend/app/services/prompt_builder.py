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


def build_recommendation_prompt(*, student_data: dict, ml_feedback: dict) -> str:
    """Build a Gemini prompt for a personalized study recommendation.

    Parameters
    ----------
    student_data:
        Raw student performance fields (subject, topic, study_hours, quiz_score,
        previous_score, attempts, time_taken, days_to_exam, last_studied_days,
        topic_difficulty, scores).
    ml_feedback:
        Output of get_feedback() — { "level": str, "accuracy": float, "trend": str }.

    Returns
    -------
    str
        A structured natural-language prompt ready for Gemini text generation.
    """
    subject = student_data.get("subject", "the subject")
    topic = student_data.get("topic", "the topic")
    study_hours = student_data.get("study_hours", 0)
    quiz_score = student_data.get("quiz_score", 0)
    days_to_exam = student_data.get("days_to_exam", 0)
    attempts = student_data.get("attempts", 0)
    topic_difficulty = student_data.get("topic_difficulty", "Medium")
    scores = student_data.get("scores", [])

    level = ml_feedback.get("level", "Average")
    accuracy = ml_feedback.get("accuracy", quiz_score)
    trend = ml_feedback.get("trend", "no trend")

    score_history = ", ".join(str(s) for s in scores) if scores else "No previous scores"

    # Map ML level to actionable guidance tone
    level_guidance = {
        "Weak": (
            "The student is struggling and needs foundational support. "
            "Recommend shorter focused sessions, concept revision before practice, "
            "and easy-level quizzes to rebuild confidence."
        ),
        "Average": (
            "The student has a moderate grasp of the topic. "
            "Recommend balanced study sessions mixing revision and practice, "
            "with medium-difficulty quizzes to solidify understanding."
        ),
        "Strong": (
            "The student is performing well. "
            "Recommend challenge-level practice, edge-case questions, "
            "and time-pressure drills to maintain and extend mastery."
        ),
    }.get(level, "Recommend balanced revision and practice sessions.")

    trend_note = {
        "improving": "The student's scores are on an upward trend — reinforce momentum.",
        "declining": "The student's scores are declining — address gaps urgently before exam.",
        "stable": "Performance is consistent — push for the next level with harder practice.",
        "no trend": "This is early data — establish a strong baseline with diagnostic quizzes.",
    }.get(trend, "")

    return f"""You are an expert AI study coach for university students.

Generate a concise, personalized study recommendation in 3-5 clear bullet points.
Do NOT use markdown headers. Start directly with the bullet points using "•".
Be specific, actionable, and encouraging. Keep the total response under 200 words.

Student Performance Summary:
- Subject: {subject}
- Topic: {topic}
- ML Performance Level: {level} (out of Weak / Average / Strong)
- Latest Accuracy: {accuracy}%
- Score History: {score_history}
- Performance Trend: {trend}
- Study Hours Per Session: {study_hours} hours
- Quiz Score: {quiz_score}%
- Quiz Attempts: {attempts}
- Topic Difficulty: {topic_difficulty}
- Days Until Exam: {days_to_exam}

ML Guidance:
{level_guidance}
{trend_note}

Generate study recommendations now:"""