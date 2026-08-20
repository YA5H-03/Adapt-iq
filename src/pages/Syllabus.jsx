import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Syllabus() {
  const navigate = useNavigate();

  const savedSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};

  const [syllabusText, setSyllabusText] = useState(savedSyllabus.syllabusText || "");
  const [examDate, setExamDate] = useState(savedSyllabus.examDate || "");
  const [pdfFile, setPdfFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      setMessage("File selected: " + file.name);
    }
  };

  const handleSave = () => {
    if (!syllabusText.trim() && !pdfFile) {
      setMessage("Please enter syllabus text or upload a document.");
      return;
    }

    const updatedData = {
      ...savedSyllabus,
      syllabusText,
      pdfName: pdfFile ? pdfFile.name : savedSyllabus.pdfName || null,
      examDate,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem("currentSyllabus", JSON.stringify(updatedData));
    setMessage("Syllabus updated successfully!");
  };

  const topicsList = syllabusText
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <div>
      <div className="page-header-banner">
        <h1>Syllabus Management 📚</h1>
        <p>Update your course modules and target exam date anytime to keep your smart timetable synchronized.</p>
      </div>

      <div className="dashboard-main-grid">
        {/* LEFT COLUMN: EDIT FORM */}
        <div className="card-container">
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>
            ✏️ Edit Syllabus & Course Content
          </h3>

          {message && (
            <div
              className={message.includes("successfully") ? "status-badge-nav" : "error-banner"}
              style={{ marginBottom: "20px", display: "flex", width: "100%" }}
            >
              <span>{message.includes("successfully") ? "✓" : "⚠️"}</span>
              <span>{message}</span>
            </div>
          )}

          <div className="form-group">
            <label>Syllabus Topics (One per line)</label>
            <textarea
              className="form-input form-input-no-icon"
              rows="10"
              value={syllabusText}
              onChange={(e) => {
                setSyllabusText(e.target.value);
                setMessage("");
              }}
              placeholder="Paste your course outline..."
            />
            <span style={{ fontSize: "12px", color: "var(--text-light)" }}>
              {topicsList.length} topics detected
            </span>
          </div>

          {/* FILE UPLOAD DROPZONE */}
          <div style={{ margin: "20px 0" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px",
                border: "1.5px dashed var(--primary-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--primary-light)",
                cursor: "pointer",
              }}
            >
              <input type="file" accept=".pdf,.csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
              <span style={{ fontSize: "24px" }}>📄</span>
              <div>
                <strong style={{ fontSize: "13px", color: "var(--primary-hover)", display: "block" }}>
                  {pdfFile ? pdfFile.name : "Upload new syllabus PDF document"}
                </strong>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Click to browse file</span>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label>Target Exam Date</label>
            <input
              type="date"
              className="form-input form-input-no-icon"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>

          <button className="btn-primary-auth" style={{ marginTop: "12px" }} onClick={handleSave}>
            Save Syllabus Changes →
          </button>
        </div>

        {/* RIGHT COLUMN: CURRENT SYLLABUS TOPICS BREAKDOWN */}
        <div className="card-container">
          <div className="card-header-flex">
            <h3><span>📌</span> Parsed Topic List</h3>
            <span className="status-badge-nav">{topicsList.length} Units</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topicsList.map((topic, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  background: "#f8fafc",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{topic}</span>
                <button
                  className="btn-small-action"
                  onClick={() => navigate("/timetable")}
                >
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Syllabus;
