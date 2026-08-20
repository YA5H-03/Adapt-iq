import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {

  const navigate = useNavigate();

  return (
    <div className="landing-page">

      {/* ================= HEADER ================= */}

      <header className="landing-header">

        <div className="landing-logo">

          <div className="landing-logo-icon">
            ✦
          </div>

          <div>
            <h2>AdaptIQ</h2>
            <span>AI Study Planner</span>
          </div>

        </div>


        <nav className="landing-nav">

          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#how">How It Works</a>

        </nav>


        <div className="header-buttons">

          <button
            className="login-outline"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          <button
            className="header-register"
            onClick={() => navigate("/register")}
          >
            Create Account
          </button>

        </div>

      </header>


      {/* ================= HERO ================= */}

      <section className="hero-section">

        <div className="hero-content">

          <div className="college-badge">
            🎓 Student Innovation Project
          </div>


          <h1>
            Study Smarter.
            <br />

            <span>Achieve More.</span>
          </h1>


          <p className="hero-description">

            AdaptIQ is an AI-powered personalized study
            planner that creates smart study schedules,
            generates quizzes from your syllabus and
            analyzes your learning performance.

          </p>


          <div className="hero-buttons">

            <button
              className="hero-primary"
              onClick={() => navigate("/register")}
            >
              Get Started →
            </button>


            <button
              className="hero-secondary"
              onClick={() => navigate("/login")}
            >
              I already have an account
            </button>

          </div>


          <div className="college-info">

            

            <div>

       

            </div>

          </div>

        </div>


        {/* ================= HERO IMAGE ================= */}

        <div className="hero-visual">

          <div className="floating-card card-one">

            <span>🔥</span>

            <div>
              <strong>7 Day Streak</strong>
              <small>Keep going!</small>
            </div>

          </div>


          <div className="dashboard-preview">

            <div className="preview-top">

              <div>
                <span>Good Morning 👋</span>
                <strong>Your Study Dashboard</strong>
              </div>

              <div className="preview-circle">
                68%
              </div>

            </div>


            <div className="preview-stats">

              <div>
                <small>Study Time</small>
                <strong>14h 30m</strong>
              </div>

              <div>
                <small>Quizzes</small>
                <strong>28</strong>
              </div>

            </div>


            <div className="preview-chart">

              <div className="chart-label">
                Weekly Progress
              </div>

              <div className="chart-bars">

                <span style={{ height: "40%" }} />
                <span style={{ height: "55%" }} />
                <span style={{ height: "45%" }} />
                <span style={{ height: "70%" }} />
                <span style={{ height: "62%" }} />
                <span style={{ height: "82%" }} />
                <span style={{ height: "92%" }} />

              </div>

            </div>


            <div className="preview-plan">

              <div className="plan-title">
                Today's Smart Plan
              </div>

              <div className="preview-task">
                <span className="task-dot purple" />
                <span>Data Structures</span>
                <small>45 min</small>
              </div>

              <div className="preview-task">
                <span className="task-dot orange" />
                <span>DBMS Revision</span>
                <small>30 min</small>
              </div>

              <div className="preview-task">
                <span className="task-dot green" />
                <span>Practice Quiz</span>
                <small>15 min</small>
              </div>

            </div>

          </div>


          <div className="floating-card card-two">

            <span>🤖</span>

            <div>
              <strong>AI Insight</strong>
              <small>Focus on weak topics</small>
            </div>

          </div>

        </div>

      </section>


      {/* ================= ABOUT ================= */}

      <section
        className="about-section"
        id="about"
      >

        <div className="section-tag">
          ABOUT ADAPTIQ
        </div>

        <h2>
          Your syllabus.
          <span> Your plan.</span>
          <br />
          Your progress.
        </h2>

        <p>

          Traditional study plans treat every student
          the same. AdaptIQ takes a different approach.
          It uses your syllabus, exam date, available
          study time and confidence level to create a
          personalized learning experience.

        </p>

      </section>


      {/* ================= FEATURES ================= */}

      <section
        className="features-section"
        id="features"
      >

        <div className="section-tag">
          WHAT ADAPTIQ OFFERS
        </div>

        <h2>
          Everything you need to
          <span> study better.</span>
        </h2>


        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon purple-bg">
              📅
            </div>

            <h3>Smart Time Table</h3>

            <p>
              Generate personalized study schedules
              based on your syllabus, exam date and
              available study hours.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon blue-bg">
              📝
            </div>

            <h3>AI Quiz Generation</h3>

            <p>
              Generate quizzes directly from your
              syllabus with different difficulty levels
              to test your understanding.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon green-bg">
              📊
            </div>

            <h3>Performance Analysis</h3>

            <p>
              Track quiz scores and identify strong
              and weak topics to improve your learning.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon orange-bg">
              🤖
            </div>

            <h3>AI Study Assistant</h3>

            <p>
              Get intelligent study recommendations
              based on your progress and learning needs.
            </p>

          </div>

        </div>

      </section>


      {/* ================= HOW IT WORKS ================= */}

      <section
        className="how-section"
        id="how"
      >

        <div className="section-tag">
          HOW IT WORKS
        </div>

        <h2>
          Start studying in
          <span> 3 simple steps.</span>
        </h2>


        <div className="steps-grid">

          <div className="step-card">

            <div className="step-number">
              01
            </div>

            <h3>Enter Your Syllabus</h3>

            <p>
              Add your subject, exam date,
              syllabus and confidence level.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              02
            </div>

            <h3>Get Your Smart Plan</h3>

            <p>
              AdaptIQ creates a personalized
              study timetable for you.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              03
            </div>

            <h3>Learn & Improve</h3>

            <p>
              Take AI-generated quizzes and
              track your learning progress.
            </p>

          </div>

        </div>

      </section>


      {/* ================= CTA ================= */}

      <section className="cta-section">

        <div>

          <h2>
            Ready to study smarter?
          </h2>

          <p>
            Create your personalized study plan today.
          </p>

        </div>


        <button
          onClick={() => navigate("/register")}
        >
          Create Free Account →
        </button>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="landing-footer">

        <div>

          <strong>AdaptIQ</strong>

          <p>
            AI-powered personalized learning platform.
          </p>

        </div>


        <div className="footer-college">

          <strong>
            Konkan Gyanpeeth College of Engineering, Karjat
          </strong>

          <span>
            University of Mumbai
          </span>

        </div>


        <div>

          <span>
            © 2026 AdaptIQ
          </span>

        </div>

      </footer>

    </div>
  );
}

export default Landing;
