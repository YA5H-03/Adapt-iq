import logging

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth, firestore

from .config import get_settings
from .dependencies import current_user
from .firebase import get_db, initialise_firebase
from .models import (
    LoginRequest,
    MLConfidenceUpdate,
    AdaptiveQuizGenerateRequest,
    AdaptiveQuizSubmitRequest,
    FeedbackRequest,
    RecommendationRequest,
    ModuleCreate,
    QuizAttemptCreate,
    RegisterRequest,
    StudyLogCreate,
    SubjectCreate,
)
from .services.gemini import generate_quiz, generate_recommendation, public_questions
from .services.ml_service import get_feedback as ml_get_feedback
from .services.performance import calculate_performance
from .services.prompt_builder import build_adaptive_quiz_prompt, build_recommendation_prompt

settings = get_settings()
logger = logging.getLogger(__name__)
app = FastAPI(title="AdaptIQ API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    body = await request.body()
    print(f"VALIDATION ERROR: {exc}")
    print(f"RAW BODY: {body}")
    return JSONResponse(status_code=422, content={"detail": exc.errors(), "body": exc.body})

def user_ref(uid: str):
    return get_db().collection("users").document(uid)


def get_or_create_quiz_scope(uid: str, subject_name: str, module_name: str):
    """Use the existing users/{uid}/subjects/{subject}/modules structure."""
    user = user_ref(uid)
    subjects = list(user.collection("subjects").where("name", "==", subject_name).limit(1).stream())
    if subjects:
        subject = subjects[0].reference
    else:
        subject = user.collection("subjects").document()
        subject.set({
            "name": subject_name,
            "syllabus": "Created from adaptive quiz request",
            "examDate": None,
            "initialConfidence": None,
            "quizScore": None,
            "attempts": 0,
            "totalQuizTimeSeconds": 0,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
    modules = list(subject.collection("modules").where("name", "==", module_name).limit(1).stream())
    if modules:
        module = modules[0].reference
    else:
        module = subject.collection("modules").document()
        module.set({"name": module_name, "weightage": 0, "quizScore": None, "attempts": 0, "createdAt": firestore.SERVER_TIMESTAMP})
    return subject, module


def get_module_attempts(subject, module_id: str) -> list[dict]:
    attempts = list(subject.collection("quizAttempts").where("moduleId", "==", module_id).stream())
    # Firestore server timestamps cannot reliably be ordered during local writes;
    # sort the materialized documents instead of relying on a composite index.
    return sorted((item.to_dict() for item in attempts), key=lambda item: str(item.get("completedAt") or item.get("takenAt") or ""))


@app.on_event("startup")
def startup() -> None:
    initialise_firebase()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> dict:
    initialise_firebase()
    try:
        user = auth.create_user(email=str(payload.email), password=payload.password, display_name=payload.display_name)
    except auth.EmailAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc

    user_ref(user.uid).set({
        "email": str(payload.email),
        "displayName": payload.display_name,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "lastStudiedDate": None,
    })
    return {"uid": user.uid, "email": user.email}


@app.post("/auth/login")
async def login(payload: LoginRequest) -> dict:
    endpoint = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(endpoint, params={"key": settings.firebase_web_api_key}, json={
                "email": str(payload.email), "password": payload.password, "returnSecureToken": True,
            })
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Authentication service is unavailable") from exc
    if response.is_error:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    result = response.json()
    return {"idToken": result["idToken"], "refreshToken": result["refreshToken"], "expiresIn": result["expiresIn"]}


from fastapi import Request

@app.post("/subjects", status_code=status.HTTP_201_CREATED)
async def create_subject(request: Request, payload: SubjectCreate, user: dict = Depends(current_user)) -> dict:
    body = await request.body()
    print(f"RAW BODY RECEIVED: {body}")
    doc = user_ref(user["uid"]).collection("subjects").document()
    doc.set({
        "name": payload.name,
        "syllabus": payload.syllabus,
        "examDate": payload.exam_date.isoformat(),
        "initialConfidence": payload.initial_confidence,
        "mlConfidenceScore": None,
        "mlConfidenceFeedback": None,
        "quizScore": None,
        "attempts": 0,
        "totalQuizTimeSeconds": 0,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })
    return {"id": doc.id}


@app.post("/subjects/{subject_id}/modules", status_code=status.HTTP_201_CREATED)
def create_module(subject_id: str, payload: ModuleCreate, user: dict = Depends(current_user)) -> dict:
    subject = user_ref(user["uid"]).collection("subjects").document(subject_id)
    if not subject.get().exists:
        raise HTTPException(status_code=404, detail="Subject not found")
    module = subject.collection("modules").document()
    module.set({"name": payload.name, "weightage": payload.weightage, "quizScore": None, "attempts": 0, "createdAt": firestore.SERVER_TIMESTAMP})
    return {"id": module.id}


@app.post("/subjects/{subject_id}/quiz-attempts", status_code=status.HTTP_201_CREATED)
def record_quiz_attempt(subject_id: str, payload: QuizAttemptCreate, user: dict = Depends(current_user)) -> dict:
    subject = user_ref(user["uid"]).collection("subjects").document(subject_id)
    if not subject.get().exists:
        raise HTTPException(status_code=404, detail="Subject not found")
    attempt = subject.collection("quizAttempts").document()
    attempt.set({"moduleId": payload.module_id, "score": payload.score, "timeTakenSeconds": payload.time_taken_seconds, "takenAt": firestore.SERVER_TIMESTAMP})
    subject.update({"attempts": firestore.Increment(1), "totalQuizTimeSeconds": firestore.Increment(payload.time_taken_seconds), "quizScore": payload.score, "updatedAt": firestore.SERVER_TIMESTAMP})
    return {"id": attempt.id}


@app.put("/subjects/{subject_id}/ml-confidence")
def update_ml_confidence(subject_id: str, payload: MLConfidenceUpdate, user: dict = Depends(current_user)) -> dict:
    subject = user_ref(user["uid"]).collection("subjects").document(subject_id)
    if not subject.get().exists:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.update({"mlConfidenceScore": payload.confidence_score, "mlConfidenceFeedback": payload.feedback, "mlAnalysedAt": firestore.SERVER_TIMESTAMP, "updatedAt": firestore.SERVER_TIMESTAMP})
    return {"updated": True}


@app.put("/study-logs")
def upsert_study_log(payload: StudyLogCreate, user: dict = Depends(current_user)) -> dict:
    log = user_ref(user["uid"]).collection("studyLogs").document(payload.study_date.isoformat())
    log.set({"studyDate": payload.study_date.isoformat(), "studyHoursTarget": payload.target_hours, "actuallyStudiedHours": payload.actual_hours, "updatedAt": firestore.SERVER_TIMESTAMP}, merge=True)
    user_ref(user["uid"]).update({"lastStudiedDate": payload.study_date.isoformat(), "updatedAt": firestore.SERVER_TIMESTAMP})
    return {"id": log.id, "updated": True}


@app.post("/quiz/generate", status_code=status.HTTP_201_CREATED)
def generate_adaptive_quiz(payload: AdaptiveQuizGenerateRequest, user: dict = Depends(current_user)) -> dict:
    """Generate and persist an adaptive quiz. Correct answers never leave this route."""
    uid = user["uid"]
    subject_name, module_name = payload.subject.strip(), payload.module.strip()
    logger.info("Adaptive quiz generation started for user=%s subject=%s module=%s", uid, subject_name, module_name)
    subject, module = get_or_create_quiz_scope(uid, subject_name, module_name)
    attempts = get_module_attempts(subject, module.id)
    performance = calculate_performance(attempts, payload.confidence)
    difficulty = performance["next_difficulty"]
    prompt = build_adaptive_quiz_prompt(
        subject=subject_name,
        module=module_name,
        num_questions=payload.num_questions,
        performance=performance,
        difficulty=difficulty,
    )
    logger.info("Adaptive performance resolved: attempts=%s difficulty=%s", performance["attempt_count"], difficulty)
    try:
        questions = generate_quiz(prompt, payload.num_questions)
    except RuntimeError as exc:
        logger.warning("Adaptive quiz generation failed for user=%s: %s", uid, exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    quiz = user_ref(uid).collection("adaptiveQuizzes").document()
    quiz.set({
        "subjectId": subject.id,
        "subject": subject_name,
        "moduleId": module.id,
        "module": module_name,
        "difficulty": difficulty,
        "confidence": payload.confidence,
        "numQuestions": payload.num_questions,
        "questions": questions,
        "status": "generated",
        "generatedAt": firestore.SERVER_TIMESTAMP,
    })
    logger.info("Adaptive quiz validated and stored quiz_id=%s", quiz.id)
    return {
        "quiz_id": quiz.id,
        "student_id": uid,
        "subject": subject_name,
        "module": module_name,
        "difficulty": difficulty,
        "performance": performance,
        "questions": public_questions(questions),
    }


@app.post("/quiz/submit")
def submit_adaptive_quiz(payload: AdaptiveQuizSubmitRequest, user: dict = Depends(current_user)) -> dict:
    """Score the stored answer key server-side and update adaptive performance."""
    uid = user["uid"]
    quiz = user_ref(uid).collection("adaptiveQuizzes").document(payload.quiz_id)
    snapshot = quiz.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Quiz not found")
    stored = snapshot.to_dict()
    if stored.get("status") == "submitted":
        raise HTTPException(status_code=409, detail="This quiz has already been submitted")
    answers = {answer.question_id: answer.selected_answer.upper() for answer in payload.answers}
    stored_questions = stored.get("questions", [])
    valid_ids = {question["id"] for question in stored_questions}
    if len(answers) != len(payload.answers) or not set(answers).issubset(valid_ids) or any(answer not in {"A", "B", "C", "D"} for answer in answers.values()):
        raise HTTPException(status_code=422, detail="Submitted answers do not match this quiz")
    question_results = []
    correct = 0
    for question in stored_questions:
        selected = answers.get(question["id"])
        is_correct = selected == question["answer"]
        correct += is_correct
        question_results.append({
            "questionId": question["id"], "concept": question["concept"], "selectedAnswer": selected,
            "correctAnswer": question["answer"], "isCorrect": is_correct,
        })
    total = len(stored_questions)
    score = round((correct / total) * 100, 2) if total else 0
    subject = user_ref(uid).collection("subjects").document(stored["subjectId"])
    module = subject.collection("modules").document(stored["moduleId"])
    attempt = subject.collection("quizAttempts").document()
    attempt.set({
        "quizId": quiz.id, "moduleId": module.id, "module": stored["module"], "score": score,
        "correctAnswers": correct, "totalQuestions": total, "confidence": stored["confidence"],
        "difficulty": stored["difficulty"], "questionResults": question_results,
        "completedAt": firestore.SERVER_TIMESTAMP,
    })
    quiz.update({"status": "submitted", "submittedAt": firestore.SERVER_TIMESTAMP, "attemptId": attempt.id})
    subject.update({"attempts": firestore.Increment(1), "quizScore": score, "updatedAt": firestore.SERVER_TIMESTAMP})
    attempts = get_module_attempts(subject, module.id)
    performance = calculate_performance(attempts, stored["confidence"])
    module.set({
        "quizScore": score, "attempts": performance["attempt_count"], "adaptivePerformance": performance,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }, merge=True)
    logger.info("Adaptive quiz submitted quiz_id=%s score=%s performance=%s", quiz.id, score, performance["performance_level"])
    return {
        "score": score, "correct": correct, "incorrect": total - correct, "total": total,
        "difficulty": stored["difficulty"], "next_difficulty": performance["next_difficulty"],
        "performance": performance, "question_results": question_results,
    }


# ---------------------------------------------------------------------------
# ML Feedback endpoint
# ---------------------------------------------------------------------------

@app.post("/feedback")
def feedback(payload: FeedbackRequest) -> dict:
    """Run the ML model + feedback engine and return a performance summary.

    This endpoint is intentionally **public** (no Firebase auth token required)
    so that the React frontend can call it directly during quiz review without
    needing to pass the user's ID token.  Add ``Depends(current_user)`` here
    when you want to restrict access to authenticated users only.

    Request body example::

        {
            "subject": "DBMS",
            "topic": "SQL",
            "study_hours": 2.0,
            "quiz_score": 45,
            "previous_score": 50,
            "attempts": 2,
            "time_taken": 10,
            "days_to_exam": 7,
            "last_studied_days": 4,
            "topic_difficulty": "Medium",
            "scores": [40, 50, 60]
        }

    Response body example::

        {
            "level": "Weak",
            "accuracy": 60.0,
            "trend": "improving"
        }
    """
    logger.info(
        "Feedback requested | subject=%s topic=%s quiz_score=%s",
        payload.subject,
        payload.topic,
        payload.quiz_score,
    )
    try:
        result = ml_get_feedback(payload.model_dump())
    except FileNotFoundError as exc:
        logger.error("ML model file missing: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "ML model is not available. "
                "Please place 'student_performance_model.joblib' in backend/model/."
            ),
        ) from exc
    except RuntimeError as exc:
        logger.error("ML model load error: %s", exc)
        raise HTTPException(status_code=503, detail="ML model failed to load.") from exc
    except Exception as exc:
        logger.exception("Unexpected error in /feedback: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error during prediction.") from exc

    logger.info(
        "Feedback result | level=%s accuracy=%s trend=%s",
        result["level"],
        result["accuracy"],
        result["trend"],
    )
    return result


# ---------------------------------------------------------------------------
# ML → Prompt Builder → Gemini orchestration endpoint
# ---------------------------------------------------------------------------

@app.post("/feedback/recommend")
def recommend(payload: RecommendationRequest) -> dict:
    """Full end-to-end orchestration: ML prediction → Prompt Builder → Gemini.

    This endpoint is the integration centrepiece.  It:

    1. Calls the ML feedback engine (``get_feedback``) to classify the student's
       performance level and trend.
    2. Passes the ML result **and** the student context into the Prompt Builder
       (``build_recommendation_prompt``) to construct a personalised prompt.
    3. Sends that prompt to the existing Gemini integration
       (``generate_recommendation``) and returns the generated study advice.

    The endpoint is intentionally **public** (no Firebase auth required) so that
    the React dashboard can call it directly.  Add ``Depends(current_user)`` when
    you want to restrict access to authenticated users.

    Request / response contract
    ---------------------------
    Request body: identical fields to ``POST /feedback`` (``RecommendationRequest``).

    Response::

        {
            "recommendation": "• Focus on ...",
            "ml_feedback": {
                "level": "Weak",
                "accuracy": 60.0,
                "trend": "improving"
            }
        }
    """
    data = payload.model_dump()

    # ── Step 1: ML prediction ────────────────────────────────────────────────
    logger.info(
        "Recommendation requested | subject=%s topic=%s quiz_score=%s",
        payload.subject, payload.topic, payload.quiz_score,
    )
    try:
        ml_feedback = ml_get_feedback(data)
    except FileNotFoundError as exc:
        logger.error("ML model file missing: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="ML model is not available. Place 'student_performance_model.joblib' in backend/model/.",
        ) from exc
    except RuntimeError as exc:
        logger.error("ML model load error: %s", exc)
        raise HTTPException(status_code=503, detail="ML model failed to load.") from exc
    except Exception as exc:
        logger.exception("Unexpected ML error in /feedback/recommend: %s", exc)
        raise HTTPException(status_code=500, detail="Internal error during ML prediction.") from exc

    # ── Step 2: Build personalised Gemini prompt ─────────────────────────────
    try:
        prompt = build_recommendation_prompt(student_data=data, ml_feedback=ml_feedback)
    except Exception as exc:
        logger.exception("Prompt builder failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to build recommendation prompt.") from exc

    # ── Step 3: Generate recommendation via Gemini ───────────────────────────
    try:
        recommendation = generate_recommendation(prompt)
    except RuntimeError as exc:
        logger.warning("Gemini recommendation failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected Gemini error in /feedback/recommend: %s", exc)
        raise HTTPException(status_code=500, detail="Internal error during Gemini generation.") from exc

    logger.info(
        "Recommendation generated | level=%s trend=%s length=%d",
        ml_feedback["level"], ml_feedback["trend"], len(recommendation),
    )
    return {"recommendation": recommendation, "ml_feedback": ml_feedback}
