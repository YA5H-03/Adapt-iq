from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


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
