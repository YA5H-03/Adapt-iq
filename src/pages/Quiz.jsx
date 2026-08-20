import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Quiz() {
  const navigate = useNavigate();

  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};

  const syllabusText = currentSyllabus.syllabusText || "";
  const topics = syllabusText
    ? syllabusText.split("\n").map((x) => x.replace(/^\d+[\).\-\s]*/, "").trim()).filter(Boolean)
    : ["Data Structures", "Algorithms", "Operating Systems", "Computer Networks", "Database Management"];

  // Setup form states
  const [selectedSubject, setSelectedSubject] = useState("Core Computer Science");
  const [selectedTopic, setSelectedTopic] = useState("Entire Syllabus");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("Medium");

  // Quiz active states
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  // Timer effect
  useEffect(() => {
    let timer;
    if (questions.length > 0 && !isCompleted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && questions.length > 0 && !isCompleted) {
      handleSubmitQuiz();
    }
    return () => clearInterval(timer);
  }, [questions, isCompleted, timeLeft]);

  // Quiz generator function
  const handleGenerateQuiz = () => {
    const activeTopics =
      selectedTopic === "Entire Syllabus" ? topics : [selectedTopic];

    const generated = [];
    for (let i = 0; i < questionCount; i++) {
      const topicName = activeTopics[i % activeTopics.length];
      
      const sampleQuestionBank = [
        {
          q: `Which algorithm or pattern is optimal for solving ${topicName} traversal?`,
          opts: [
            `Depth-First Search (DFS) or Breadth-First Search (BFS)`,
            `Binary Search on sorted arrays`,
            `Greedy choice property with minimum spanner`,
            `Direct hashing with O(1) space complexity`
          ],
          ans: 0
        },
        {
          q: `What is the key worst-case time complexity associated with ${topicName}?`,
          opts: [
            `O(N log N) time complexity`,
            `O(1) constant time`,
            `O(2^N) exponential time`,
            `O(N) linear time complexity`
          ],
          ans: 0
        },
        {
          q: `In the context of ${topicName}, what does memory allocation require?`,
          opts: [
            `Dynamic heap allocation and pointer linkage`,
            `Static stack frame registration`,
            `Contiguous memory block indexing`,
            `Virtual address translation registers`
          ],
          ans: 0
        },
        {
          q: `Why is ${topicName} essential in system design and software architecture?`,
          opts: [
            `It enables modular design, high concurrency, and data safety.`,
            `It eliminates the need for compilation steps.`,
            `It replaces operating system thread schedulers.`,
            `It guarantees zero network latency.`
          ],
          ans: 0
        }
      ];

      const template = sampleQuestionBank[i % sampleQuestionBank.length];

      generated.push({
        id: i,
        topic: topicName,
        question: template.q,
        options: template.opts,
        correctAnswer: template.ans
      });
    }

    setQuestions(generated);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeLeft(questionCount * 60); // 1 minute per question
    setIsCompleted(false);
    setScoreResult(null);
  };

  const handleSelectOption = (optionIndex) => {
    setUserAnswers({
      ...userAnswers,
      [currentIndex]: optionIndex
    });
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    const strongTopics = new Set();
    const weakTopics = new Set();

    questions.forEach((q, idx) => {
      const userChoice = userAnswers[idx];
      if (userChoice === q.correctAnswer) {
        correctCount++;
        strongTopics.add(q.topic);
      } else {
        weakTopics.add(q.topic);
      }
    });

    const percent = Math.round((correctCount / questions.length) * 100);

    setScoreResult({
      score: correctCount,
      total: questions.length,
      percentage: percent,
      strong: Array.from(strongTopics),
      weak: Array.from(weakTopics)
    });
    setIsCompleted(true);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // RESULT SCREEN
  if (isCompleted && scoreResult) {
    return (
      <div className="result-card-container">
        <div className="result-score-badge">
          <h2>{scoreResult.percentage}%</h2>
          <span>{scoreResult.score} / {scoreResult.total} Correct</span>
        </div>

        <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}>
          {scoreResult.percentage >= 70 ? "🎉 Outstanding Performance!" : "💪 Good Effort! Keep Practicing"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
          {scoreResult.percentage >= 70
            ? "You have demonstrated strong mastery over these syllabus topics."
            : "Review the weak topic areas below to boost your accuracy."}
        </p>

        {/* TAGS ANALYSIS */}
        <div className="result-tags-section">
          {scoreResult.strong.length > 0 && (
            <div className="result-tag-box strong">
              <strong>Green Areas (Strong):</strong>
              <div style={{ marginTop: "4px" }}>{scoreResult.strong.join(", ")}</div>
            </div>
          )}

          {scoreResult.weak.length > 0 && (
            <div className="result-tag-box weak">
              <strong>Red Areas (Needs Practice):</strong>
              <div style={{ marginTop: "4px" }}>{scoreResult.weak.join(", ")}</div>
            </div>
          )}
        </div>

        {/* QUESTION BY QUESTION REVIEW */}
        <div style={{ textAlign: "left", margin: "32px 0 24px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Detailed Question Analysis</h3>

          {questions.map((q, idx) => {
            const userChoice = userAnswers[idx];
            const isCorrect = userChoice === q.correctAnswer;
            return (
              <div
                key={idx}
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${isCorrect ? "var(--success-border)" : "var(--danger-border)"}`,
                  background: isCorrect ? "var(--success-bg)" : "var(--danger-bg)",
                  marginBottom: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "14px" }}>Q{idx + 1}: {q.question}</strong>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: isCorrect ? "var(--success)" : "var(--danger)" }}>
                    {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Your answer: <strong>{userChoice !== undefined ? q.options[userChoice] : "Not answered"}</strong>
                </div>
                {!isCorrect && (
                  <div style={{ fontSize: "13px", color: "var(--success)", marginTop: "4px" }}>
                    Correct answer: <strong>{q.options[q.correctAnswer]}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button className="btn-primary-auth" style={{ width: "auto" }} onClick={handleGenerateQuiz}>
            🔄 Retake Quiz
          </button>
          <button className="btn-secondary-nav" onClick={() => setQuestions([])}>
            ✨ Configure New Quiz
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE QUIZ INTERFACE
  if (questions.length > 0) {
    const currentQ = questions[currentIndex];
    const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

    return (
      <div className="quiz-interface-card">
        {/* TOP BAR */}
        <div className="quiz-timer-header">
          <div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)" }}>ADAPTIVE QUIZ INTERFACE</span>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-main)", marginTop: "2px" }}>
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>

          <div className={`timer-pill ${timeLeft < 60 ? "warning-timer" : ""}`}>
            <span>⏱️</span>
            <span>{formatTimer(timeLeft)}</span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="progress-bar-track" style={{ marginBottom: "24px" }}>
          <div className="progress-bar-fill fill-indigo" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* TOPIC BADGE */}
        <div style={{ marginBottom: "16px" }}>
          <span className="timeline-tag tag-new" style={{ fontSize: "12px", padding: "4px 12px" }}>
            Topic: {currentQ.topic}
          </span>
        </div>

        {/* QUESTION TEXT */}
        <h2 className="question-text-heading">{currentQ.question}</h2>

        {/* OPTIONS */}
        <div className="quiz-options-list">
          {currentQ.options.map((opt, optIdx) => {
            const isSelected = userAnswers[currentIndex] === optIdx;
            return (
              <button
                key={optIdx}
                className={`quiz-option-button ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectOption(optIdx)}
              >
                <div className="option-badge-circle">
                  {String.fromCharCode(65 + optIdx)}
                </div>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* FOOTER NAVIGATION */}
        <div className="quiz-nav-footer">
          <button
            className="btn-secondary-nav"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            style={{ opacity: currentIndex === 0 ? 0.5 : 1 }}
          >
            ← Previous Question
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              className="btn-primary-nav"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
            >
              Next Question →
            </button>
          ) : (
            <button className="btn-primary-nav" style={{ background: "var(--success)" }} onClick={handleSubmitQuiz}>
              Submit Quiz ✓
            </button>
          )}
        </div>
      </div>
    );
  }

  // QUIZ SETUP FORM
  return (
    <div>
      <div className="page-header-banner">
        <h1>Adaptive Quiz Generator 📝</h1>
        <p>Test your conceptual understanding with AI-generated quizzes customized to your syllabus.</p>
      </div>

      <div className="quiz-setup-card">
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "20px" }}>Configure Quiz Parameters</h2>

        <div className="timetable-setup-grid">
          <div className="form-group">
            <label>Subject</label>
            <select
              className="form-input form-input-no-icon"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option>Core Computer Science</option>
              <option>Data Structures & Algorithms</option>
              <option>Operating Systems</option>
              <option>Database Systems</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target Topic</label>
            <select
              className="form-input form-input-no-icon"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option>Entire Syllabus</option>
              {topics.map((t, idx) => (
                <option key={idx} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="timetable-setup-grid">
          <div className="form-group">
            <label>Number of Questions</label>
            <select
              className="form-input form-input-no-icon"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            >
              <option value={5}>5 Questions (Quick Test)</option>
              <option value={10}>10 Questions (Standard)</option>
              <option value={15}>15 Questions (Deep Evaluation)</option>
              <option value={20}>20 Questions (Full Mock)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Difficulty Level</label>
            <select
              className="form-input form-input-no-icon"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="Easy">Easy (Fundamentals)</option>
              <option value="Medium">Medium (Balanced)</option>
              <option value="Hard">Hard (Exam Standard)</option>
            </select>
          </div>
        </div>

        <button className="btn-generate-plan" onClick={handleGenerateQuiz}>
          ✨ Generate Quiz & Start Timer →
        </button>
      </div>
    </div>
  );
}

export default Quiz;