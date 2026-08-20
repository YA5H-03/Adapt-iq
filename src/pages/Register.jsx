import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerStudent } from "../lib/api";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please complete all registration fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerStudent({
        display_name: form.name,
        email: form.email,
        password: form.password,
      });
    } catch (err) {
      console.warn("Backend registration offline, continuing with local account setup:", err.message);
    }

    localStorage.setItem("studentData", JSON.stringify({ name: form.name, email: form.email }));
    localStorage.setItem("studentRegistered", "true");
    setIsSubmitting(false);
    navigate("/login");
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
            <span>🚀</span> Join 10,000+ High Performing Students
          </div>
          <h1>Create Your Personalized AI Study Workspace</h1>
          <p>
            Organize your courses, generate smart study schedules, and master weak topics faster with AI insights.
          </p>

          <div className="auth-hero-features">
            <div className="feature-pill">
              <div className="feature-pill-icon">📊</div>
              <div>
                <strong>Mastery Progress Tracking</strong>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>Real-time analytics on syllabus coverage</p>
              </div>
            </div>

            <div className="feature-pill">
              <div className="feature-pill-icon">⚡</div>
              <div>
                <strong>Instant Setup in 2 Minutes</strong>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>Paste your syllabus text or upload PDF</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-hero-footer">
          <span>Free account • No credit card required</span>
        </div>
      </div>

      {/* RIGHT FORM SIDE */}
      <div className="auth-form-side">
        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h2>Create Account ✨</h2>
            <p>Start your customized study journey today.</p>
          </div>

          {error && (
            <div className="error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Alex Johnson"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>College or Student Email</label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔑</span>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary-auth" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Get Started →"}
            </button>
          </form>

          <div className="auth-switch-text">
            Already have an account?
            <button type="button" onClick={() => navigate("/login")}>
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
