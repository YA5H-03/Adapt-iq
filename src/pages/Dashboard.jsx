import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const student = JSON.parse(localStorage.getItem("studentData")) || {};
  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};

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
          <div className="stat-box-value">68%</div>
          <div className="stat-box-sub green">↑ 12% boost this week</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill fill-indigo" style={{ width: "68%" }} />
          </div>
        </div>

        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Study Time Goal</span>
            <div className="stat-box-icon icon-emerald">⏱️</div>
          </div>
          <div className="stat-box-value">14.5 hrs</div>
          <div className="stat-box-sub muted">Goal: 20 hrs / week</div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill fill-emerald" style={{ width: "72.5%" }} />
          </div>
        </div>

        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Quizzes Completed</span>
            <div className="stat-box-icon icon-amber">📝</div>
          </div>
          <div className="stat-box-value">28</div>
          <div className="stat-box-sub green">71% Average Accuracy</div>
        </div>

        <div className="stat-box-card">
          <div className="stat-box-header">
            <span>Current Streak</span>
            <div className="stat-box-icon icon-rose">🔥</div>
          </div>
          <div className="stat-box-value">5 Days</div>
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
              Based on your target date and <strong>{confidence}</strong> confidence level, we recommend allocating 45 minutes to weak topics before taking practice quizzes.
            </p>
            <button className="btn-card-action" onClick={() => navigate("/quiz")}>
              Take Adaptive Quiz →
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
              <div className="plan-timeline-item">
                <div className="timeline-time-col">09:00 AM</div>
                <div className="timeline-info-col">
                  <strong>{topics[0] || "Data Structures Revision"}</strong>
                  <span className="timeline-tag tag-weak">Weak Topic</span>
                </div>
                <div className="timeline-action-col">
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>45 min</span>
                  <button className="btn-small-action" onClick={() => navigate("/timetable")}>
                    Start
                  </button>
                </div>
              </div>

              <div className="plan-timeline-item">
                <div className="timeline-time-col">10:30 AM</div>
                <div className="timeline-info-col">
                  <strong>{topics[1] || "Algorithms & Practice"}</strong>
                  <span className="timeline-tag tag-practice">Practice Session</span>
                </div>
                <div className="timeline-action-col">
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>60 min</span>
                  <button className="btn-small-action" onClick={() => navigate("/timetable")}>
                    Start
                  </button>
                </div>
              </div>

              <div className="plan-timeline-item">
                <div className="timeline-time-col">02:00 PM</div>
                <div className="timeline-info-col">
                  <strong>Adaptive Topic Quiz</strong>
                  <span className="timeline-tag tag-revision">Self Assessment</span>
                </div>
                <div className="timeline-action-col">
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>15 min</span>
                  <button className="btn-small-action" onClick={() => navigate("/quiz")}>
                    Start
                  </button>
                </div>
              </div>
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
                <strong style={{ color: "var(--primary)" }}>58%</strong>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill fill-indigo" style={{ width: "58%" }} />
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
              <div className="weak-topic-title">
                <span>🔴</span> Lowest Scoring Topic
              </div>
              <strong style={{ fontSize: "15px", display: "block", color: "var(--text-main)", margin: "4px 0" }}>
                {topics[0] || "Operating Systems Scheduling"}
              </strong>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "14px" }}>
                Accuracy is 42%. Take a quick 5-question test to improve mastery.
              </p>

              <button className="btn-small-action" style={{ width: "100%" }} onClick={() => navigate("/quiz")}>
                Practice This Topic Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;