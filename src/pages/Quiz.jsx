import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateAdaptiveQuiz, submitAdaptiveQuiz, updateSubjectConfidence } from "../lib/api";
import { generateFullSchedule } from "../lib/scheduleGenerator";

const answerLetter = (index) => String.fromCharCode(65 + index);

function Quiz() {
  const navigate = useNavigate();
  const syllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
  const subjects = (syllabus.subjects || []).filter((item) => item.name && item.modules?.length);
  const topics = (syllabus.syllabusText || "").split("\n").map((item) => item.replace(/^\d+[).\-\s]*/, "").trim()).filter(Boolean);
  const structured = subjects.length > 0;
  const [subjectId, setSubjectId] = useState(structured ? subjects[0].id : "flat");
  const [module, setModule] = useState(structured ? subjects[0].modules[0]?.name || "" : topics[0] || "");
  const [questionCount, setQuestionCount] = useState(10);
  const [confidence, setConfidence] = useState("average");
  const [questions, setQuestions] = useState([]);
  const [quizId, setQuizId] = useState("");
  const [meta, setMeta] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [result, setResult] = useState(null);
  const [adaptiveInfo, setAdaptiveInfo] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subject = subjects.find((item) => item.id === subjectId);
  const modules = structured ? (subject?.modules || []).filter((item) => item.name?.trim()) : topics.map((name) => ({ id: name, name }));
  const subjectName = structured ? subject?.name || "General" : "General";

  useEffect(() => {
    if (!questions.length || result || timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => setTimeLeft((seconds) => seconds - 1), 1000);
    return () => window.clearInterval(timer);
  }, [questions.length, result, timeLeft]);

  const submitQuiz = async () => {
    const token = localStorage.getItem("firebaseIdToken");
    if (!token || !quizId || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await submitAdaptiveQuiz(
        token,
        quizId,
        questions
          .map((question) => ({ question_id: question.id, selected_answer: answers[question.id] || "" }))
          .filter((answer) => answer.selected_answer)
      );
      setResult(data);

      const attempts = JSON.parse(localStorage.getItem("quizAttempts")) || [];
      const newAttempt = {
        percentage: data.score,
        score: data.correct,
        total: data.total,
        subject: meta?.subject || subjectName,
        module: meta?.module || module,
        ml_feedback: data.ml_feedback,
        date: new Date().toISOString(),
      };
      localStorage.setItem("quizAttempts", JSON.stringify([newAttempt, ...attempts]));

      // ── AI Adaptive Timetable Rebalancing ──────────────────────────────────
      const savedSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
      let currentSubjects = savedSyllabus.subjects || subjects || [];
      const targetSubName = meta?.subject || subjectName;

      // Extract level predicted by ML model
      const mlLevel = data.ml_feedback?.level || data.updated_confidence || (data.score < 50 ? "Weak" : data.score >= 80 ? "Strong" : "Average");

      // Update subject confidence in memory
      let updatedSubjects = currentSubjects.map((s) => {
        if (s.name?.trim().toLowerCase() === targetSubName.trim().toLowerCase() || s.id === subjectId) {
          return { ...s, confidence: mlLevel };
        }
        return s;
      });

      // If no subject match found in list, add or preserve
      if (!updatedSubjects.some((s) => s.name?.trim().toLowerCase() === targetSubName.trim().toLowerCase())) {
        if (updatedSubjects.length === 0) {
          updatedSubjects = [{
            id: crypto.randomUUID(),
            name: targetSubName,
            examDate: savedSyllabus.examDate || "",
            totalMarks: 100,
            confidence: mlLevel,
            modules: [{ id: crypto.randomUUID(), name: meta?.module || module || "Main Topic", weightage: 10 }],
          }];
        }
      }

      // Save updated syllabus
      const updatedSyllabus = { ...savedSyllabus, subjects: updatedSubjects };
      localStorage.setItem("currentSyllabus", JSON.stringify(updatedSyllabus));

      // Sync updated confidence to backend Firestore
      const targetSubObj = updatedSubjects.find((s) => s.name?.trim().toLowerCase() === targetSubName.trim().toLowerCase() || s.id === subjectId);
      if (token && targetSubObj && targetSubObj.id && targetSubObj.id !== "flat") {
        updateSubjectConfidence(token, targetSubObj.id, { confidence: mlLevel }).catch((err) => {
          console.warn("Could not sync updated confidence to backend:", err);
        });
      }

      // Regenerate the full timetable schedule automatically
      const dailyHours = Number(updatedSyllabus.dailyHours) || 3;
      const newSchedule = generateFullSchedule(updatedSubjects, dailyHours);
      if (newSchedule && newSchedule.length > 0) {
        localStorage.setItem("currentSchedule", JSON.stringify(newSchedule));
      }

      setAdaptiveInfo({
        subject: targetSubName,
        level: mlLevel,
        trend: data.ml_feedback?.trend || (data.score >= 70 ? "improving" : "stable"),
        accuracy: data.ml_feedback?.accuracy ?? data.score,
        totalDays: newSchedule.length,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    const token = localStorage.getItem("firebaseIdToken");
    if (!token) { setError("Please log in before generating an AI quiz."); return; }
    if (!module) { setError("Select a module before generating the quiz."); return; }
    setLoading(true); setError("");
    try {
      const data = await generateAdaptiveQuiz(token, { subject: subjectName, module, num_questions: questionCount, confidence });
      setQuestions(data.questions); setQuizId(data.quiz_id);
      setMeta({ subject: data.subject, module: data.module, difficulty: data.difficulty, performance: data.performance });
      setIndex(0); setAnswers({}); setTimeLeft(questionCount * 60); setResult(null); setAdaptiveInfo(null);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const formatTimer = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (result) {
    const levelColors = {
      Weak: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", badge: "#ef4444" },
      Average: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", badge: "#f59e0b" },
      Strong: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", badge: "#10b981" },
    };
    const currentTheme = levelColors[adaptiveInfo?.level] || levelColors.Average;

    return (
      <div className="result-card-container">
        <div className="result-score-badge">
          <h2>{result.score}%</h2>
          <span>{result.correct} / {result.total} Correct</span>
        </div>

        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "28px", marginBottom: "8px" }}>
          {result.score >= 70 ? "🎉 Great work!" : "💪 Keep practicing"}
        </h1>

        <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
          Performance: <strong>{result.performance?.performance_level?.replaceAll("_", " ") || "In progress"}</strong> ·
          Trend: <strong>{result.performance?.attempt_count < 2 ? "First attempt recorded" : result.performance?.trend?.replaceAll("_", " ")}</strong> ·
          Next Quiz Difficulty: <strong>{result.next_difficulty}</strong>
        </p>

        {/* ── AI ADAPTIVE TIMETABLE UPDATE BANNER ── */}
        {adaptiveInfo && (
          <div
            style={{
              padding: "18px 22px",
              background: currentTheme.bg,
              border: `1.5px solid ${currentTheme.border}`,
              borderRadius: "var(--radius-md)",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>⚡</span>
                <strong style={{ fontSize: "15px", color: currentTheme.text }}>
                  AI Timetable Automatically Rebalanced!
                </strong>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: currentTheme.badge,
                  color: "#ffffff",
                }}
              >
                ML Mastery: {adaptiveInfo.level}
              </span>
            </div>

            <p style={{ fontSize: "13px", color: currentTheme.text, margin: "6px 0 14px", lineHeight: "1.6" }}>
              Based on your quiz score (<strong>{result.score}%</strong>) and ML trend analysis (<strong>{adaptiveInfo.trend}</strong>),
              the system updated <strong>{adaptiveInfo.subject}</strong> to <strong>{adaptiveInfo.level}</strong> priority.
              {adaptiveInfo.level === "Weak"
                ? " This topic is now allocated 3× more revision slots in morning focus hours."
                : adaptiveInfo.level === "Average"
                ? " This topic is allocated 2× standard revision passes."
                : " High mastery confirmed! Schedule has optimized revision rounds to focus on remaining targets."}
            </p>

            <button
              className="btn-primary-auth"
              style={{ width: "auto", padding: "8px 18px", fontSize: "13px", background: "var(--primary)" }}
              onClick={() => navigate("/timetable")}
            >
              📅 View Adapted Timetable →
            </button>
          </div>
        )}

        {result.performance?.weak_areas?.length > 0 && (
          <div className="result-tag-box weak" style={{ marginBottom: "20px" }}>
            Focus next on: {result.performance.weak_areas.join(", ")}
          </div>
        )}

        <div style={{ textAlign: "left", margin: "24px 0" }}>
          {result.question_results?.map((item, position) => (
            <div key={item.questionId} className={`result-tag-box ${item.isCorrect ? "strong" : "weak"}`} style={{ marginBottom: "10px" }}>
              <strong>Q{position + 1}: {item.isCorrect ? "✓ Correct" : item.selectedAnswer ? "✗ Incorrect" : "– Not attempted"}</strong>
              {!item.isCorrect && <div>Correct answer: {item.correctAnswer}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary-auth" style={{ width: "auto" }} onClick={() => { setQuestions([]); setResult(null); setAdaptiveInfo(null); }}>
            ⚡ Take Another Quiz
          </button>
          <button className="btn-secondary-nav" style={{ width: "auto", padding: "12px 20px" }} onClick={() => navigate("/dashboard")}>
            📊 Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length) {
    const question = questions[index];
    return (
      <div className="quiz-interface-card">
        <div className="quiz-timer-header">
          <div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)" }}>AI ADAPTIVE QUIZ · {meta?.difficulty}</span>
            <div style={{ fontWeight: "700" }}>Question {index + 1} of {questions.length}</div>
          </div>
          <div className={`timer-pill ${timeLeft < 60 ? "warning-timer" : ""}`}>⏱️ {formatTimer(timeLeft)}</div>
        </div>
        <div className="progress-bar-track" style={{ marginBottom: "24px" }}>
          <div className="progress-bar-fill fill-indigo" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <span className="timeline-tag tag-new">Concept: {question.concept}</span>
        <h2 className="question-text-heading" style={{ marginTop: "16px" }}>{question.question}</h2>
        <div className="quiz-options-list">
          {question.options.map((option, optionIndex) => (
            <button
              key={option}
              className={`quiz-option-button ${answers[question.id] === answerLetter(optionIndex) ? "selected" : ""}`}
              onClick={() => setAnswers({ ...answers, [question.id]: answerLetter(optionIndex) })}
            >
              <div className="option-badge-circle">{answerLetter(optionIndex)}</div>
              <span>{option}</span>
            </button>
          ))}
        </div>
        {error && <p className="error-banner">{error}</p>}
        <div className="quiz-nav-footer">
          <button className="btn-secondary-nav" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>
            ← Previous
          </button>
          {index < questions.length - 1 ? (
            <button className="btn-primary-nav" onClick={() => setIndex((current) => current + 1)}>
              Next Question →
            </button>
          ) : (
            <button className="btn-primary-nav" style={{ background: "var(--success)" }} disabled={loading} onClick={submitQuiz}>
              {loading ? "Submitting…" : "Submit Quiz ✓"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header-banner">
        <h1>Adaptive Quiz Generator 📝</h1>
        <p>Gemini creates questions from your selected module and real quiz history. Quiz results automatically adapt your study timetable via ML.</p>
      </div>

      <div className="quiz-setup-card">
        <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>Configure Quiz Parameters</h2>
        {error && <div className="error-banner" style={{ marginBottom: "18px" }}>⚠️ {error}</div>}
        {!modules.length && (
          <div className="error-banner" style={{ marginBottom: "18px" }}>
            Add a subject and module in <button onClick={() => navigate("/timetable")} style={{ color: "var(--primary)", fontWeight: 700 }}>Smart Timetable</button> first.
          </div>
        )}

        <div className="timetable-setup-grid">
          <div className="form-group">
            <label>Subject</label>
            {structured ? (
              <select
                className="form-input form-input-no-icon"
                value={subjectId}
                onChange={(event) => {
                  const nextSubject = subjects.find((item) => item.id === event.target.value);
                  setSubjectId(event.target.value);
                  setModule(nextSubject?.modules?.find((item) => item.name?.trim())?.name || "");
                }}
              >
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            ) : (
              <input className="form-input form-input-no-icon" value="General" readOnly />
            )}
          </div>
          <div className="form-group">
            <label>Module / Topic</label>
            <select className="form-input form-input-no-icon" value={module} onChange={(event) => setModule(event.target.value)}>
              {modules.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="timetable-setup-grid">
          <div className="form-group">
            <label>Number of Questions</label>
            <select className="form-input form-input-no-icon" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>
              {[5, 10, 15, 20].map((count) => (
                <option key={count} value={count}>{count} Questions</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>How confident are you?</label>
            <select className="form-input form-input-no-icon" value={confidence} onChange={(event) => setConfidence(event.target.value)}>
              <option value="weak">Weak — diagnostic support</option>
              <option value="average">Average — balanced practice</option>
              <option value="strong">Strong — challenge me</option>
            </select>
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            background: "var(--primary-light)",
            border: "1px solid var(--primary-border)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "20px",
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🤖</span>
          <span>
            <strong>Adaptive Link:</strong> Once submitted, the ML model analyzes your score and immediately adjusts your weekly revision frequency and timetable slots!
          </span>
        </div>

        <button className="btn-generate-plan" disabled={loading || !modules.length} onClick={startQuiz}>
          {loading ? "Generating with Gemini…" : "✨ Generate Adaptive AI Quiz"}
        </button>
      </div>
    </div>
  );
}

export default Quiz;
