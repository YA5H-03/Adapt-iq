import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginStudent } from "../lib/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    // Clear ALL previous user's data so different accounts don't bleed into each other
    const keysToRemove = [
      "studentData", "currentSyllabus", "quizAttempts",
      "currentSchedule", "firebaseIdToken", "studentRegistered",
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    let displayName = email.split("@")[0] || "Student";

    try {
      const session = await loginStudent({ email, password });
      if (!session || !session.idToken) {
        setError("Login failed: no token received from server. Please try again.");
        setIsSubmitting(false);
        return;
      }
      localStorage.setItem("firebaseIdToken", session.idToken);
      if (session.display_name) {
        displayName = session.display_name;
      }
    } catch (err) {
      // Show the real error — wrong password, account not found, server down, etc.
      setError(err.message || "Login failed. Please check your credentials and try again.");
      setIsSubmitting(false);
      return;
    }

    const updatedStudent = { name: displayName, email };
    localStorage.setItem("studentData", JSON.stringify(updatedStudent));
    localStorage.setItem("studentRegistered", "true");
    setIsSubmitting(false);
    navigate("/dashboard");
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
                  placeholder="user@example.com"
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
              <span className="forgot-link">Password reset is managed in Firebase</span>
            </div>

            <button type="submit" className="btn-primary-auth" disabled={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log In to Workspace →"}
            </button>
          </form>

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
