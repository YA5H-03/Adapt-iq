import { useState } from "react";
import { useNavigate } from "react-router-dom";

function StudySetup() {
  const navigate = useNavigate();

  const [syllabusText, setSyllabusText] = useState(
    `Unit 1: Data Structures & Arrays\nUnit 2: Linked Lists & Stacks\nUnit 3: Binary Trees & Traversal\nUnit 4: Graph Algorithms & BFS/DFS\nUnit 5: Sorting & Dynamic Programming`
  );
  const [pdfFile, setPdfFile] = useState(null);
  const [examDate, setExamDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [confidence, setConfidence] = useState("Intermediate");
  const [dailyHours, setDailyHours] = useState(3);
  const [error, setError] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      setError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!syllabusText.trim() && !pdfFile) {
      setError("Please enter your syllabus topics or upload a syllabus file.");
      return;
    }

    if (!examDate) {
      setError("Please specify your upcoming exam date.");
      return;
    }

    const syllabusData = {
      syllabusText: syllabusText,
      pdfName: pdfFile ? pdfFile.name : "Syllabus_Document.pdf",
      examDate: examDate,
      confidence: confidence,
      dailyHours: dailyHours,
      uploadedAt: new Date().toISOString(),
    };

    localStorage.setItem("currentSyllabus", JSON.stringify(syllabusData));
    localStorage.setItem("setupCompleted", "true");
    navigate("/dashboard");
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <div className="auth-brand-logo" onClick={() => navigate("/")}>
            <div className="brand-spark">✦</div>
            <h2 style={{ color: "#0f172a" }}>AdaptIQ</h2>
          </div>
          <div className="status-badge-nav">
            <span>Step 1 of 1 • Study Preferences</span>
          </div>
        </div>

        <div className="card-container">
          <div style={{ marginBottom: "28px" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1px" }}>
              PERSONALIZATION SETUP
            </span>
            <h1 style={{ fontFamily: "Outfit, sans-serif", fontSize: "30px", fontWeight: "700", margin: "6px 0", color: "#0f172a" }}>
              Configure Your Smart Study Plan
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Provide your syllabus and exam details so AdaptIQ can construct your smart daily timetable and quizzes.
            </p>
          </div>

          {error && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* SECTION 1: SYLLABUS */}
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "15px", fontWeight: "700" }}>1. Enter Syllabus / Topics</label>
              <textarea
                className="form-input form-input-no-icon"
                rows="6"
                placeholder="Enter or paste syllabus modules (one topic per line)..."
                value={syllabusText}
                onChange={(e) => {
                  setSyllabusText(e.target.value);
                  setError("");
                }}
              />
            </div>

            {/* FILE UPLOAD DROPZONE */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ textAlign: "center", margin: "12px 0", color: "var(--text-light)", fontSize: "12px", fontWeight: "600" }}>
                OR ATTACH SYLLABUS PDF / CSV
              </div>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  border: "2px dashed var(--primary-border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--primary-light)",
                  cursor: "pointer",
                }}
              >
                <input type="file" accept=".pdf,.csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
                <span style={{ fontSize: "28px", marginBottom: "8px" }}>📄</span>
                <strong style={{ fontSize: "14px", color: "var(--primary-hover)" }}>
                  {pdfFile ? pdfFile.name : "Click to browse or drop syllabus PDF file"}
                </strong>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Supports PDF, TXT, CSV up to 10MB</span>
              </label>
            </div>

            {/* SECTION 2: EXAM DATE & HOURS */}
            <div className="timetable-setup-grid">
              <div className="form-group">
                <label style={{ fontWeight: "700" }}>2. Upcoming Exam Date</label>
                <div className="input-with-icon">
                  <span className="input-icon">📅</span>
                  <input
                    type="date"
                    className="form-input"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="range-slider-header">
                  <label style={{ fontWeight: "700" }}>Daily Target Study Hours</label>
                  <span style={{ color: "var(--primary)", fontWeight: "700" }}>{dailyHours} Hours / Day</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  className="custom-range-input"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                />
              </div>
            </div>

            {/* SECTION 3: CONFIDENCE LEVEL */}
            <div className="form-group" style={{ margin: "24px 0 32px" }}>
              <label style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px" }}>
                3. Select Your Current Confidence Level
              </label>
              <div className="confidence-selector-grid">
                <div
                  className={`confidence-card-btn ${confidence === "Low" || confidence === "Beginner" ? "selected" : ""}`}
                  onClick={() => setConfidence("Beginner")}
                >
                  <span style={{ fontSize: "24px" }}>🌱</span>
                  <strong>Beginner</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Needs basics & full revision</span>
                </div>

                <div
                  className={`confidence-card-btn ${confidence === "Intermediate" || confidence === "Medium" ? "selected" : ""}`}
                  onClick={() => setConfidence("Intermediate")}
                >
                  <span style={{ fontSize: "24px" }}>⚡</span>
                  <strong>Intermediate</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Knows core concepts</span>
                </div>

                <div
                  className={`confidence-card-btn ${confidence === "High" || confidence === "Advanced" ? "selected" : ""}`}
                  onClick={() => setConfidence("Advanced")}
                >
                  <span style={{ fontSize: "24px" }}>🚀</span>
                  <strong>Advanced</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Focus on rapid practice</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-generate-plan">
              ✨ Build Smart Study Workspace →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default StudySetup;