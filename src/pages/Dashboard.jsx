import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const student = JSON.parse(localStorage.getItem("studentData")) || {};
  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
  const quizAttempts = JSON.parse(localStorage.getItem("quizAttempts")) || [];
  const currentSchedule = JSON.parse(localStorage.getItem("currentSchedule")) || [];

  const studentName = student.name || "Student";
  const syllabusText = currentSyllabus.syllabusText || "";
  const topics = syllabusText
    ? syllabusText.split("\n").map((x) => x.trim()).filter(Boolean)
    : [];

  const examDate = currentSyllabus.examDate;
  let daysLeft = "Not set";
  if (examDate) {
    const diff = new Date(examDate) - new Date();
    daysLeft = `${Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))} days`;
  }

  const confidence = currentSyllabus.confidence || "Intermediate";

  // Calculate stats from actual user data
  const quizzesCompleted = quizAttempts.length;
  const avgAccuracy = quizzesCompleted > 0
    ? Math.round(quizAttempts.reduce((acc, q) => acc + (q.percentage || 0), 0) / quizzesCompleted)
    : 0;
  const overallMastery = quizzesCompleted > 0 ? avgAccuracy : 0;

  // Calculate completion percentage from schedule if available
  let totalSlots = 0;
  let completedSlots = 0;
  currentSchedule.forEach((day) => {
    (day.slots || []).forEach((slot) => {
      totalSlots++;
      if (slot.completed) completedSlots++;
    });
  });
  const syllabusCompletion = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

  // Find lowest scoring topic from weak topics in quiz attempts
  const weakTopicCounts = {};
  quizAttempts.forEach((attempt) => {
    (attempt.weak || []).forEach((t) => {
      weakTopicCounts[t] = (weakTopicCounts[t] || 0) + 1;
    });
  });
  const sortedWeakTopics = Object.keys(weakTopicCounts).sort(
    (a, b) => weakTopicCounts[b] - weakTopicCounts[a]
  );
  const lowestScoringTopic = sortedWeakTopics[0] || (topics.length > 0 ? topics[0] : null);

  // Determine today's plan slots from schedule or empty
  const todaySchedule = currentSchedule.length > 0 ? currentSchedule[0].slots || [] : [];

  return (
    <div>
      {/* WELCOME BANNER */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-title-area">
          <span>AI STUDY DASHBOARD</span>
          <h1>Welcome back, {studentName} 👋</h1>
          <p>Here is your personalized learning plan and performance insights for today.</p>
        </div>

        <button className="btn-primary-auth" style={{ width: "auto", padding: "12px 20px" }} onClick={() => navigate("/timetable")}>
          📅 View Full Smart Plan
        </button>
      </div>

      {/* STATS OVERVIEW GRID */}
      <div className="stats-overview-grid">
        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Overall Mastery</span>
            <div className="stat-box-icon icon-purple">🎯</div>
          </div>
          <div className="stat-box-value">{overallMastery}%</div>
          <div className="stat-box-sub muted">{quizzesCompleted > 0 ? "Based on quiz history" : "No quizzes taken yet"}</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill fill-indigo" style={{ width: `${overallMastery}%` }} />
          </div>
        </div>

        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Study Time Goal</span>
            <div className="stat-box-icon icon-emerald">⏱️</div>
          </div>
          <div className="stat-box-value">{currentSyllabus.dailyHours ? `${currentSyllabus.dailyHours} hrs/day` : "0 hrs"}</div>
          <div className="stat-box-sub muted">Goal: {currentSyllabus.dailyHours ? currentSyllabus.dailyHours * 7 : 0} hrs / week</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill fill-emerald" style={{ width: `${syllabusCompletion}%` }} />
          </div>
        </div>

        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Quizzes Completed</span>
            <div className="stat-box-icon icon-amber">📝</div>
          </div>
          <div className="stat-box-value">{quizzesCompleted}</div>
          <div className="stat-box-sub green">{quizzesCompleted > 0 ? `${avgAccuracy}% Average Accuracy` : "Take a quiz to see accuracy"}</div>
        </div>

        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Current Streak</span>
            <div className="stat-box-icon icon-rose">🔥</div>
          </div>
          <div className="stat-box-value">{quizzesCompleted > 0 ? "1 Day" : "0 Days"}</div>
          <div className="stat-box-sub green">Exam in {daysLeft}</div>
        </div>
      </div>

      {/* MAIN DASHBOARD GRID */}
      <div className="dashboard-main-grid">
        {/* LEFT COLUMN: AI INSIGHT & TODAY'S TIMELINE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* AI RECOMMENDATION BANNER */}
          <div className="ai-recommendation-card">
            <h3>✦ AI Study Recommendation</h3>
            <p>
              {topics.length > 0
                ? `Based on your target date and ${confidence} confidence level, we recommend focusing on your syllabus topics and taking practice quizzes.`
                : "Enter your syllabus topics in Study Setup or Syllabus Management to receive custom AI study recommendations."}
            </p>
            <button className="btn-card-action" onClick={() => navigate(topics.length > 0 ? "/quiz" : "/syllabus")}>
              {topics.length > 0 ? "Take Adaptive Quiz →" : "Set Up Syllabus →"}
            </button>
          </div>

          {/* TODAY'S PLAN PREVIEW */}
          <div className="card-container">
            <div className="card-header-flex">
              <h3><span>📅</span> Today's Smart Plan</h3>
              <button
                style={{ color: "var(--primary)", fontWeight: "600", fontSize: "13px" }}
                onClick={() => navigate("/timetable")}
              >
                Customize Schedule →
              </button>
            </div>

            <div className="plan-timeline-list">
              {todaySchedule.length > 0 ? (
                todaySchedule.map((slot) => (
                  <div className="plan-timeline-item" key={slot.id}>
                    <div className="timeline-time-col">{slot.time}</div>
                    <div className="timeline-info-col">
                      <strong>{slot.topic}</strong>
                      <span className={`timeline-tag ${slot.tagClass || "tag-practice"}`}>{slot.type || "Study"}</span>
                    </div>
                    <div className="timeline-action-col">
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{slot.duration}</span>
                      <button className="btn-small-action" onClick={() => navigate("/timetable")}>
                        Start
                      </button>
                    </div>
                  </div>
                ))
              ) : topics.length > 0 ? (
                topics.slice(0, 3).map((topic, idx) => (
                  <div className="plan-timeline-item" key={idx}>
                    <div className="timeline-time-col">{idx === 0 ? "09:00 AM" : idx === 1 ? "11:00 AM" : "02:00 PM"}</div>
                    <div className="timeline-info-col">
                      <strong>{topic}</strong>
                      <span className="timeline-tag tag-practice">Study Session</span>
                    </div>
                    <div className="timeline-action-col">
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>45 min</span>
                      <button className="btn-small-action" onClick={() => navigate("/timetable")}>
                        Start
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                  No study timetable generated yet. Add your syllabus and click <strong>Generate Smart Plan</strong> in the timetable view.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SYLLABUS & WEAK TOPICS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* SYLLABUS CARD */}
          <div className="card-container">
            <div className="card-header-flex">
              <h3><span>📚</span> Current Syllabus</h3>
              <span style={{ fontSize: "12px", background: "var(--primary-light)", color: "var(--primary)", padding: "4px 10px", borderRadius: "12px", fontWeight: "700" }}>
                {topics.length} Topics
              </span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Syllabus Completion</span>
                <strong style={{ color: "var(--primary)" }}>{syllabusCompletion}%</strong>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill fill-indigo" style={{ width: `${syllabusCompletion}%` }} />
              </div>
            </div>

            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Exam Date: <strong style={{ color: "var(--text-main)" }}>{examDate || "Not set"}</strong>
            </div>

            <button
              className="btn-secondary-nav"
              style={{ width: "100%", textAlign: "center" }}
              onClick={() => navigate("/syllabus")}
            >
              Manage Syllabus & Topics →
            </button>
          </div>

          {/* NEEDS ATTENTION ALERT */}
          <div className="card-container">
            <div className="card-header-flex">
              <h3><span>⚠️</span> Needs Attention</h3>
            </div>

            <div className="weak-topic-alert-box">
              {lowestScoringTopic ? (
                <>
                  <div className="weak-topic-title">
                    <span>🔴</span> Lowest Scoring Topic
                  </div>
                  <strong style={{ fontSize: "15px", display: "block", color: "var(--text-main)", margin: "4px 0" }}>
                    {lowestScoringTopic}
                  </strong>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px" }}>
                    {quizzesCompleted > 0
                      ? "Identified as needing improvement based on your recent quiz performance."
                      : "Take a practice quiz to evaluate and identify your weak topics."}
                  </p>

                  <button className="btn-small-action" style={{ width: "100%" }} onClick={() => navigate("/quiz")}>
                    Practice This Topic Now
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                  No weak topics identified yet. Complete a quiz to analyze topic performance.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;