from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


ConfidenceLevel = Literal["Beginner", "Intermediate", "Advanced"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    syllabus: str = Field(min_length=1)
    exam_date: date
    initial_confidence: ConfidenceLevel


class ModuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    weightage: float = Field(ge=0, le=100)


class QuizAttemptCreate(BaseModel):
    module_id: str | None = None
    score: float = Field(ge=0, le=100)
    time_taken_seconds: int = Field(ge=0)


class StudyLogCreate(BaseModel):
    study_date: date
    target_hours: float = Field(ge=0, le=24)
    actual_hours: float = Field(ge=0, le=24)


class MLConfidenceUpdate(BaseModel):
    confidence_score: float = Field(ge=0, le=100)
    feedback: str = Field(min_length=1, max_length=2000)


QuizConfidence = Literal["weak", "average", "strong"]


class AdaptiveQuizGenerateRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=120)
    module: str = Field(min_length=1, max_length=160)
    num_questions: int = Field(ge=1, le=30)
    confidence: QuizConfidence


class QuizAnswerSubmission(BaseModel):
    question_id: str = Field(min_length=1, max_length=100)
    selected_answer: str = Field(min_length=1, max_length=1)


class AdaptiveQuizSubmitRequest(BaseModel):
    quiz_id: str = Field(min_length=1, max_length=100)
    answers: list[QuizAnswerSubmission] = Field(default_factory=list, max_length=30)


# ---------------------------------------------------------------------------
# ML Feedback endpoint
# ---------------------------------------------------------------------------

TopicDifficulty = Literal["Easy", "Medium", "Hard"]


class FeedbackRequest(BaseModel):
    """Input schema for POST /feedback.

    All fields mirror the feature set expected by the trained Decision Tree.
    The ``scores`` list carries the full score history and is used exclusively
    by the deterministic feedback engine (not passed to the model).
    """

    subject: str = Field(min_length=1, max_length=120)
    topic: str = Field(min_length=1, max_length=160)
    study_hours: float = Field(ge=0, le=24)
    quiz_score: float = Field(ge=0, le=100)
    previous_score: float = Field(ge=0, le=100)
    attempts: int = Field(ge=0)
    time_taken: float = Field(ge=0, description="Time taken on the quiz in minutes")
    days_to_exam: int = Field(ge=0)
    last_studied_days: int = Field(ge=0, description="Days since last study session")
    topic_difficulty: TopicDifficulty = "Medium"
    scores: list[float] = Field(
        default_factory=list,
        description="Chronological list of historical quiz scores (0-100)",
    )

    @field_validator("scores")
    @classmethod
    def scores_must_be_valid(cls, v: list[float]) -> list[float]:
        for score in v:
            if not (0 <= score <= 100):
                raise ValueError(f"Each score must be between 0 and 100, got {score}")
        return v


class RecommendationRequest(FeedbackRequest):
    """Request body for POST /feedback/recommend.

    Identical to ``FeedbackRequest`` — the same student performance data is used
    for both the ML prediction and the Gemini prompt.  A separate model is defined
    so that the two endpoints can evolve independently if needed.
    """
