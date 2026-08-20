import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  const student = JSON.parse(localStorage.getItem("studentData")) || {};
  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};

  const [name, setName] = useState(student.name || "Student");
  const [email, setEmail] = useState(student.email || "student@university.edu");
  const [confidence, setConfidence] = useState(currentSyllabus.confidence || "Intermediate");
  const [savedMsg, setSavedMsg] = useState("");

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedStudent = { ...student, name, email };
    localStorage.setItem("studentData", JSON.stringify(updatedStudent));

    const updatedSyllabus = { ...currentSyllabus, confidence };
    localStorage.setItem("currentSyllabus", JSON.stringify(updatedSyllabus));

    setSavedMsg("Profile settings updated successfully!");
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset your study data?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div>
      <div className="page-header-banner">
        <h1>Profile & Study Settings 👤</h1>
        <p>Manage your account, study preferences, and AI engine defaults.</p>
      </div>

      <div className="dashboard-main-grid">
        {/* LEFT USER CARD */}
        <div className="card-container" style={{ textAlign: "center", padding: "36px" }}>
          <div
            className="user-avatar-circle"
            style={{ width: "90px", height: "90px", fontSize: "36px", margin: "0 auto 20px" }}
          >
            {name ? name.charAt(0).toUpperCase() : "S"}
          </div>

          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-main)" }}>{name}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>{email}</p>

          <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "var(--radius-md)", textAlign: "left", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--text-muted)" }}>Target Exam:</span>
              <strong>{currentSyllabus.examDate || "Not Set"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Confidence Level:</span>
              <strong style={{ color: "var(--primary)" }}>{confidence}</strong>
            </div>
          </div>
        </div>

        {/* RIGHT EDIT FORM */}
        <div className="card-container">
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Account & Study Preferences</h3>

          {savedMsg && (
            <div className="status-badge-nav" style={{ marginBottom: "20px", display: "flex", width: "100%" }}>
              <span>✓</span>
              <span>{savedMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-input form-input-no-icon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input form-input-no-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Default Confidence Level</label>
              <select
                className="form-input form-input-no-icon"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              >
                <option value="Beginner">Beginner (Needs basic revision)</option>
                <option value="Intermediate">Intermediate (Standard pace)</option>
                <option value="Advanced">Advanced (High-speed practice)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary-auth" style={{ marginTop: "12px" }}>
              Save Profile Settings →
            </button>
          </form>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "32px 0 24px" }} />

          <div>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--danger)", marginBottom: "6px" }}>
              Danger Zone
            </h4>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
              Reset all stored local study data and log out.
            </p>
            <button
              type="button"
              style={{ padding: "10px 18px", background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)", borderRadius: "var(--radius-sm)", fontWeight: "600", fontSize: "13px" }}
              onClick={handleResetData}
            >
              Reset Local Storage & Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;