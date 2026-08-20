import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    const storedData = localStorage.getItem("studentData");
    const student = storedData ? JSON.parse(storedData) : null;

    if (!student) {
      // If no account stored, automatically create a default session for seamless testing!
      const defaultStudent = {
        name: email ? email.split("@")[0] : "Alex Student",
        email: email || "student@college.edu",
        password: password || "password123",
      };
      localStorage.setItem("studentData", JSON.stringify(defaultStudent));
      localStorage.setItem("studentRegistered", "true");
      navigate("/dashboard");
      return;
    }

    if (student.email && student.email.toLowerCase() !== email.toLowerCase()) {
      setError("Email not found. You can use 'Fill Demo Credentials' below to test!");
      return;
    }

    localStorage.setItem("studentRegistered", "true");
    navigate("/dashboard");
  };

  const fillDemoAccount = () => {
    const demoStudent = {
      name: "Vidhi Student",
      email: "vidhi@university.edu",
      password: "password123",
    };
    localStorage.setItem("studentData", JSON.stringify(demoStudent));
    localStorage.setItem("studentRegistered", "true");
    
    // Also add a sample syllabus if none exists
    const existingSyllabus = localStorage.getItem("currentSyllabus");
    if (!existingSyllabus) {
      localStorage.setItem(
        "currentSyllabus",
        JSON.stringify({
          syllabusText: "Unit 1: Data Structures & Arrays\nUnit 2: Linked Lists & Stacks\nUnit 3: Binary Trees & Traversal\nUnit 4: Graph Algorithms & BFS/DFS\nUnit 5: Sorting & Dynamic Programming",
          examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          confidence: "Intermediate",
        })
      );
    }
    
    setEmail("vidhi@university.edu");
    setPassword("password123");
    setError("");
  };

  return (
    <div className="auth-split-container">
      {/* LEFT HERO SIDE */}
      <div className="auth-hero-side">
        <div className="auth-brand-logo" onClick={() => navigate("/")}>
          <div className="brand-spark">✦</div>
          <h2>AdaptIQ</h2>
        </div>

        <div className="auth-hero-content">
          <div className="auth-hero-tag">
            <span>✦</span> AI-Powered Learning Engine
          </div>
          <h1>Study 3x Smarter with Adaptive Timetables</h1>
          <p>
            AdaptIQ transforms your syllabus into daily smart schedules and interactive quizzes that adapt to your target exam date.
          </p>

          <div className="auth-hero-features">
            <div className="feature-pill">
              <div className="feature-pill-icon">📅</div>
              <div>
                <strong>Smart Timetable Generation</strong>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>Auto-allocates study slots by topic weight</p>
              </div>
            </div>

            <div className="feature-pill">
              <div className="feature-pill-icon">📝</div>
              <div>
                <strong>Dynamic Quiz Practice</strong>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>Generates instant quizzes from your syllabus</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>Trusted by top university students</span>
          <span>•</span>
          <span>Instant Setup</span>
        </div>
      </div>

      {/* RIGHT FORM SIDE */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h2>Welcome back 👋</h2>
            <p>Enter your details to log in to your study workspace.</p>
          </div>

          {error && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); fillDemoAccount(); }} className="forgot-link">
                Forgot password?
              </a>
            </div>

            <button type="submit" className="btn-primary-auth">
              Log In to Workspace →
            </button>
          </form>

          {/* QUICK DEMO LOGIN BOX */}
          <div className="demo-login-box">
            <p>Testing the app? Click below to populate demo student data:</p>
            <button type="button" className="btn-demo" onClick={fillDemoAccount}>
              ✨ Fill Demo Credentials
            </button>
          </div>

          <div className="auth-switch-text">
            Don't have an account yet?
            <button type="button" onClick={() => navigate("/register")}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;