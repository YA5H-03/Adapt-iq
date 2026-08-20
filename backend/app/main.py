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
    ModuleCreate,
    QuizAttemptCreate,
    RegisterRequest,
    StudyLogCreate,
    SubjectCreate,
)

settings = get_settings()
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
