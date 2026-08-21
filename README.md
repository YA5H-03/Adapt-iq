# AdaptIQ

An AI-powered personalized study planner for building smart schedules, managing subject modules, and tracking study progress.

## Backend: Firebase Authentication + Firestore

The Python API is in [`backend`](backend). It stores study data in Firestore and delegates password handling to Firebase Authentication. Passwords are deliberately **not** written to Firestore.

1. Create a Firebase project, enable **Email/Password** in Authentication, and create a Firestore database.
2. Download a service-account JSON file from Firebase project settings and save it as `backend/service-account.json` (this is ignored by Git).
3. Copy `backend/.env.example` to `backend/.env`, then fill `FIREBASE_WEB_API_KEY`, the service-account path, and `GEMINI_API_KEY`.
4. From `backend`, install requirements and run the API:

   ```bash
   py -m pip install --upgrade pip
   py -m pip install -r requirements.txt
   py -m uvicorn app.main:app --reload --port 8000
   ```

API documentation is available at `http://localhost:8000/docs`. Send the Firebase ID token returned by `POST /auth/login` as `Authorization: Bearer <idToken>` for study-data endpoints.

Firestore structure:

```text
users/{uid}                         # email, displayName, lastStudiedDate
  subjects/{subjectId}              # syllabus, examDate, confidence, quiz score/attempt stats
    modules/{moduleId}               # module name, weightage, module quiz data
    quizAttempts/{attemptId}         # score and time taken for each quiz
  studyLogs/{YYYY-MM-DD}             # target/actual study hours for the day
  adaptiveQuizzes/{quizId}           # server-only generated questions and answer key
```

ML analysis is saved with `PUT /subjects/{subject_id}/ml-confidence` as a numeric confidence score plus student-facing feedback. Deploy [`backend/firestore.rules`](backend/firestore.rules) to restrict users to their own data.

### Adaptive quiz API

The adaptive quiz workflow is implemented in the FastAPI backend. It uses the verified Firebase token as the student identity, not a client-supplied student ID. Gemini is called only by the backend and its response is parsed and validated before a quiz is stored.

`POST /quiz/generate`

```json
{
  "subject": "Data Structures",
  "module": "Trees",
  "num_questions": 10,
  "confidence": "weak"
}
```

The response has `quiz_id`, adaptive `difficulty`, current `performance`, and questions without answer keys.

`POST /quiz/submit`

```json
{
  "quiz_id": "generated-quiz-id",
  "answers": [{"question_id": "1", "selected_answer": "B"}]
}
```

The backend scores the stored answer key, stores the attempt under the existing `subjects/{subjectId}/quizAttempts` collection, and returns score, question results, performance trend, and `next_difficulty`. Both routes require `Authorization: Bearer <Firebase ID token>`.

Performance is a deterministic, explainable rules service—not a trained ML model. It calculates the current/previous/average score, a trend from the recent scores, repeated missed concepts as weak areas, and a gradual next-difficulty recommendation. The threshold and difficulty mappings live in `backend/app/services/performance.py`.

## Frontend development
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
