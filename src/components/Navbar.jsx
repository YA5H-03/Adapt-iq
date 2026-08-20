import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const student = JSON.parse(localStorage.getItem("studentData")) || {};
  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};

  const [searchQuery, setSearchQuery] = useState("");

  const examDate = currentSyllabus.examDate;
  let daysLeft = null;
  if (examDate) {
    const diff = new Date(examDate) - new Date();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate("/timetable");
    }
  };

  return (
    <header className="top-navbar">
      {/* SEARCH BAR */}
      <form className="top-navbar-search" onSubmit={handleSearch}>
        <span className="search-icon-nav">🔍</span>
        <input
          type="text"
          placeholder="Search topics, quizzes, schedule..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      {/* RIGHT ACTIONS */}
      <div className="top-navbar-actions">
        {daysLeft !== null && (
          <div className="status-badge-nav">
            <div className="status-dot-pulse" />
            <span>{daysLeft} days until Exam</span>
          </div>
        )}

        <button
          className="nav-link-item"
          style={{ padding: "8px 12px" }}
          onClick={() => navigate("/quiz")}
        >
          ⚡ Quick Quiz
        </button>

        <div
          className="user-avatar-circle"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/profile")}
          title="View Profile"
        >
          {student.name ? student.name.charAt(0).toUpperCase() : "S"}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
