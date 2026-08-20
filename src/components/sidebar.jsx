import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();
  const student = JSON.parse(localStorage.getItem("studentData")) || {};

  const handleLogout = () => {
    localStorage.removeItem("studentRegistered");
    localStorage.removeItem("studentData");
    navigate("/login");
  };

  return (
    <aside className="app-sidebar">
      {/* BRAND HEADER */}
      <div className="sidebar-header" onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
        <div className="sidebar-logo-icon">✦</div>
        <div className="sidebar-brand-name">
          <h3>AdaptIQ</h3>
          <p>AI Study Planner</p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "nav-link-item active" : "nav-link-item")}
        >
          <span className="nav-link-icon">🏠</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/timetable"
          className={({ isActive }) => (isActive ? "nav-link-item active" : "nav-link-item")}
        >
          <span className="nav-link-icon">📅</span>
          <span>Smart Timetable</span>
        </NavLink>

        <NavLink
          to="/quiz"
          className={({ isActive }) => (isActive ? "nav-link-item active" : "nav-link-item")}
        >
          <span className="nav-link-icon">📝</span>
          <span>Adaptive Quiz</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => (isActive ? "nav-link-item active" : "nav-link-item")}
        >
          <span className="nav-link-icon">👤</span>
          <span>Profile Settings</span>
        </NavLink>
      </nav>

      {/* MINI AI CARD */}
      <div className="sidebar-ai-box">
        <div className="sidebar-ai-box-header">
          <span>✦</span>
          <span>AI Adaptive Engine</span>
        </div>
        <p>Your plan adjusts automatically as you take quizzes and finish topics.</p>
      </div>

      {/* FOOTER USER */}
      <div className="sidebar-footer">
        <div className="user-mini-info">
          <div className="user-avatar-circle">
            {student.name ? student.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="user-name-role">
            <strong>{student.name || "Student"}</strong>
            <span>{student.email || "Learner"}</span>
          </div>
        </div>

        <button className="btn-logout-icon" onClick={handleLogout} title="Logout">
          ↪
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
