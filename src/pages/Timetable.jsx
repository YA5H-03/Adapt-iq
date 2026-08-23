import { useState, useEffect } from "react";
import { createSubject, createModule, getSubjects } from "../lib/api";
import { generateFullSchedule, toYMD } from "../lib/scheduleGenerator";

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
function Timetable() {
  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
  const defaultExamDate = currentSyllabus.examDate || "";

  const getInitialSubjects = () => {
    if (currentSyllabus.subjects && currentSyllabus.subjects.length > 0) {
      return currentSyllabus.subjects;
    }
    if (currentSyllabus.syllabusText) {
      const topicLines = currentSyllabus.syllabusText.split("\n").map((x) => x.trim()).filter(Boolean);
      if (topicLines.length > 0) {
        return [{
          id: crypto.randomUUID(), name: "Primary Subject", examDate: defaultExamDate,
          totalMarks: 100, confidence: currentSyllabus.confidence || "Average",
          modules: topicLines.map((t) => ({ id: crypto.randomUUID(), name: t, weightage: 10 })),
        }];
      }
    }
    return [{
      id: crypto.randomUUID(), name: "", examDate: defaultExamDate,
      totalMarks: 100, confidence: "Average",
      modules: [{ id: crypto.randomUUID(), name: "", weightage: 0 }],
    }];
  };

  const [subjects,    setSubjects]    = useState(getInitialSubjects);
  const [dailyHours,  setDailyHours]  = useState(currentSyllabus.dailyHours || 3);
  const [schedule,    setSchedule]    = useState(() => JSON.parse(localStorage.getItem("currentSchedule")) || []);
  const [fetchStatus, setFetchStatus] = useState("idle");

  // Week navigation (index into schedule array, always jump by 7)
  const [weekStart, setWeekStart] = useState(0);
  // Active day index within the full schedule
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Map backend confidence names → UI names
  const confidenceFromDB = (initial) => ({ Beginner: "Weak", Intermediate: "Average", Advanced: "Strong" }[initial] || "Average");

  // On mount: fetch latest subjects and confidence from backend, then generate the timetable
  useEffect(() => {
    const token = localStorage.getItem("firebaseIdToken");
    if (!token) return;

    setFetchStatus("loading");
    getSubjects(token)
      .then((data) => {
        if (!data || data.length === 0) {
          setFetchStatus("idle");
          return;
        }
        const mapped = data.map((s) => ({
          id: s.id || crypto.randomUUID(),
          name: s.name || "",
          examDate: s.examDate || "",
          totalMarks: s.totalMarks || 100,
          confidence: confidenceFromDB(s.initialConfidence),
          modules: s.modules?.length > 0
            ? s.modules.map((m) => ({ id: m.id || crypto.randomUUID(), name: m.name || "", weightage: m.weightage || 0 }))
            : [{ id: crypto.randomUUID(), name: "", weightage: 0 }],
        }));
        setSubjects(mapped);

        const saved = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
        const hours = Number(saved.dailyHours) || dailyHours || 3;
        const updatedSyllabus = { ...saved, subjects: mapped, dailyHours: hours };
        localStorage.setItem("currentSyllabus", JSON.stringify(updatedSyllabus));

        // Generate and update the fresh timetable from the latest backend subjects & ML confidence
        const freshSchedule = generateFullSchedule(mapped, hours);
        if (freshSchedule && freshSchedule.length > 0) {
          setSchedule(freshSchedule);
          localStorage.setItem("currentSchedule", JSON.stringify(freshSchedule));
        }
        setFetchStatus("idle");
      })
      .catch((err) => {
        console.error("Failed to fetch subjects from backend:", err);
        setFetchStatus("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CRUD helpers
  const updateSubject = (id, field, value) => setSubjects((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const addSubject    = () => setSubjects((items) => [...items, { id: crypto.randomUUID(), name: "", examDate: defaultExamDate, totalMarks: 100, modules: [{ id: crypto.randomUUID(), name: "", weightage: 0 }], confidence: "Average" }]);
  const removeSubject = (id) => setSubjects((items) => items.length > 1 ? items.filter((item) => item.id !== id) : items);
  const updateModule  = (sid, mid, field, value) => setSubjects((items) => items.map((s) => s.id !== sid ? s : { ...s, modules: s.modules.map((m) => m.id === mid ? { ...m, [field]: value } : m) }));
  const addModule     = (sid) => setSubjects((items) => items.map((s) => s.id === sid ? { ...s, modules: [...s.modules, { id: crypto.randomUUID(), name: "", weightage: 0 }] } : s));
  const removeModule  = (sid, mid) => setSubjects((items) => items.map((s) => s.id === sid && s.modules.length > 1 ? { ...s, modules: s.modules.filter((m) => m.id !== mid) } : s));

  const [isSyncing,   setIsSyncing]   = useState(false);
  const [isUpdating,  setIsUpdating]  = useState(false);
  const [updateToast, setUpdateToast] = useState("");

  const handleGenerateSchedule = async () => {
    const validSubjects = subjects.filter((s) => s.name.trim() && s.examDate && s.modules.some((m) => m.name.trim()));
    if (validSubjects.length === 0) {
      alert("Please add at least one subject with an exam date and at least one module.");
      return;
    }

    const generatedDays = generateFullSchedule(validSubjects, dailyHours);
    if (generatedDays.length === 0) {
      alert("All exam dates are in the past. Please update your exam dates.");
      return;
    }

    setSchedule(generatedDays);
    setWeekStart(0);
    setActiveDayIdx(0);
    localStorage.setItem("currentSchedule", JSON.stringify(generatedDays));
    localStorage.setItem("currentSyllabus", JSON.stringify({ ...currentSyllabus, subjects, dailyHours }));

    // Sync to Firebase
    const token = localStorage.getItem("firebaseIdToken");
    if (token) {
      setIsSyncing(true);
      try {
        const confidenceMap = { Weak: "Beginner", Average: "Intermediate", Strong: "Advanced" };
        for (const subject of subjects) {
          if (!subject.name.trim()) continue;
          const subjectRes = await createSubject(token, {
            name: subject.name.trim(), syllabus: "Modules provided in Timetable",
            exam_date: subject.examDate || new Date().toISOString().split("T")[0],
            initial_confidence: confidenceMap[subject.confidence] || "Intermediate",
          });
          for (const mod of subject.modules) {
            if (!mod.name.trim()) continue;
            await createModule(token, subjectRes.id, { name: mod.name.trim(), weightage: Number(mod.weightage) || 0 });
          }
        }
      } catch (err) { console.error("Firebase sync error:", err); }
      finally { setIsSyncing(false); }
    }
  };

  const handleUpdateAndRegenerate = async () => {
    setIsUpdating(true);
    const saved = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
    localStorage.setItem("currentSyllabus", JSON.stringify({ ...saved, subjects, dailyHours }));
    await handleGenerateSchedule();
    setIsUpdating(false);
    setUpdateToast("✅ Full timetable regenerated successfully!");
    setTimeout(() => setUpdateToast(""), 3500);
  };

  const toggleTaskDone = (dayIndex, slotId) => {
    const updated = [...schedule];
    const slot = updated[dayIndex].slots.find((s) => s.id === slotId);
    if (slot) slot.completed = !slot.completed;
    setSchedule(updated);
    localStorage.setItem("currentSchedule", JSON.stringify(updated));
  };

  // Stats
  let totalTasks = 0, completedTasks = 0;
  schedule.forEach((d) => d.slots.forEach((s) => { totalTasks++; if (s.completed) completedTasks++; }));
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Week window
  const WEEK = 7;
  const weekDays   = schedule.slice(weekStart, weekStart + WEEK);
  const totalWeeks = Math.ceil(schedule.length / WEEK);
  const currentWeek = Math.floor(weekStart / WEEK) + 1;
  const canPrev = weekStart > 0;
  const canNext = weekStart + WEEK < schedule.length;

  const goToPrevWeek = () => {
    const nw = Math.max(0, weekStart - WEEK);
    setWeekStart(nw);
    setActiveDayIdx(nw);
  };
  const goToNextWeek = () => {
    const nw = Math.min(schedule.length - 1, weekStart + WEEK);
    setWeekStart(nw);
    setActiveDayIdx(nw);
  };

  // Jump to today
  const goToToday = () => {
    const todayStr = toYMD(new Date());
    const idx = schedule.findIndex((d) => d.date === todayStr);
    if (idx >= 0) {
      const ws = Math.floor(idx / WEEK) * WEEK;
      setWeekStart(ws);
      setActiveDayIdx(idx);
    }
  };

  const activeDay = schedule[activeDayIdx];

  return (
    <div>
      <div className="page-header-banner">
        <h1>Smart Plan &amp; Timetable 📅</h1>
        <p>Full exam-prep schedule with live ML-adaptive rebalancing on every quiz attempt.</p>
      </div>

      {/* DB FETCH STATUS BANNERS */}
      {fetchStatus === "loading" && (
        <div style={{ padding: "14px 20px", background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: "var(--radius-md)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: "600", color: "var(--primary-hover)" }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
          Loading your saved subjects from the database…
        </div>
      )}
      {fetchStatus === "error" && (
        <div style={{ padding: "14px 20px", background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: "var(--radius-md)", marginBottom: "20px", fontSize: "14px", fontWeight: "600", color: "#991b1b" }}>
          ⚠️ Could not load your saved subjects. You can still enter them manually below.
        </div>
      )}

      {/* INPUT PARAMETER FORM */}
      <div className="card-container" style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>⚙️ Study Schedule Generator Controls</h3>

        <div className="subjects-control-header">
          <div>
            <h4>Subjects &amp; Exam Dates</h4>
            <p>Add every subject with its exam date. The schedule runs from today to your last exam and adapts dynamically as you quiz.</p>
          </div>
          <button type="button" className="btn-add-subject" onClick={addSubject}>+ Add Subject</button>
        </div>

        <div className="subject-list">
          {subjects.map((subject, index) => (
            <div className="subject-entry" key={subject.id}>
              <div className="subject-entry-heading">
                <span>Subject {index + 1}</span>
                {subjects.length > 1 && <button type="button" onClick={() => removeSubject(subject.id)} aria-label={`Remove subject ${index + 1}`}>Remove</button>}
              </div>
              <div className="timetable-setup-grid subject-entry-grid">
                <div className="form-group">
                  <label>Subject / Course Name</label>
                  <input type="text" className="form-input form-input-no-icon" value={subject.name} onChange={(e) => updateSubject(subject.id, "name", e.target.value)} placeholder="e.g. Mathematics, Physics" />
                </div>
                <div className="form-group">
                  <label>Target Exam Date</label>
                  <input type="date" className="form-input form-input-no-icon" value={subject.examDate} onChange={(e) => updateSubject(subject.id, "examDate", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Total Subject Marks</label>
                  <input type="number" min="1" className="form-input form-input-no-icon" value={subject.totalMarks} onChange={(e) => updateSubject(subject.id, "totalMarks", e.target.value)} />
                </div>
              </div>
              <div className="form-group module-weightage-group">
                <div className="module-weightage-heading">
                  <div><label>Modules &amp; Marks Weightage</label><small>Higher-mark modules get more revision rounds.</small></div>
                  <button type="button" className="btn-add-module" onClick={() => addModule(subject.id)}>+ Add Module</button>
                </div>
                <div className="module-list">
                  {subject.modules.map((module, moduleIndex) => (
                    <div className="module-row" key={module.id}>
                      <input type="text" className="form-input form-input-no-icon" value={module.name} onChange={(e) => updateModule(subject.id, module.id, "name", e.target.value)} placeholder={`Module ${moduleIndex + 1} name`} />
                      <input type="number" min="0" className="form-input form-input-no-icon" value={module.weightage} onChange={(e) => updateModule(subject.id, module.id, "weightage", e.target.value)} aria-label={`Marks for module ${moduleIndex + 1}`} placeholder="Marks" />
                      {subject.modules.length > 1 && <button type="button" className="btn-remove-module" onClick={() => removeModule(subject.id, module.id)} aria-label={`Remove module ${moduleIndex + 1}`}>×</button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group subject-confidence-group">
                <label>
                  Confidence Level for {subject.name || `Subject ${index + 1}`}
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "8px", fontWeight: "normal" }}>
                    (Live auto-updated by ML Quiz predictions)
                  </span>
                </label>
                <div className="confidence-selector-grid">
                  {["Weak", "Average", "Strong"].map((level) => (
                    <button key={level} className={`confidence-card-btn ${subject.confidence === level ? "selected" : ""}`} type="button" onClick={() => updateSubject(subject.id, "confidence", level)}>
                      <span>{level === "Weak" ? "🔴" : level === "Average" ? "🟡" : "🟢"}</span>
                      <strong>{level}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-group">
          <div className="range-slider-header">
            <label>Daily Study Hours Target</label>
            <span style={{ color: "var(--primary)", fontWeight: "700" }}>{dailyHours} Hours / Day → {dailyHours} sessions of 1 hr each</span>
          </div>
          <input type="range" min="1" max="10" className="custom-range-input" value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} />
        </div>

        {updateToast && (
          <div style={{ marginBottom: "12px", padding: "12px 18px", background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "var(--radius-sm)", color: "#065f46", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            {updateToast}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn-generate-plan" onClick={handleGenerateSchedule} disabled={isSyncing || isUpdating} style={{ flex: 1 }}>
            {isSyncing ? "Syncing to Cloud..." : "✨ Generate Full Exam Plan"}
          </button>
          {schedule.length > 0 && (
            <button className="btn-generate-plan" onClick={handleUpdateAndRegenerate} disabled={isSyncing || isUpdating} style={{ flex: 1, background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}>
              {isUpdating ? "Updating..." : "🔄 Update & Regenerate"}
            </button>
          )}
        </div>
      </div>

      {/* AI ADAPTIVE NOTE */}
      <div style={{ padding: "16px 20px", background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: "var(--radius-md)", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "20px" }}>⚡</span>
        <div>
          <strong style={{ fontSize: "14px", color: "var(--primary-hover)" }}>Active AI Adaptive Engine</strong>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {schedule.length > 0
              ? `${schedule.length}-day plan · ${totalTasks} total sessions · Every quiz automatically updates subject mastery via ML Decision Trees and rebalances your revision cycles!`
              : `${subjects.length} subject(s) · ${dailyHours} hrs/day · Weak topics = 3× revisions, Average = 2×, Strong = 1×`}
          </p>
        </div>
      </div>

      {/* SCHEDULE RESULTS VIEW */}
      {schedule.length > 0 && (
        <div className="generated-schedule-container">

          {/* HEADER ROW */}
          <div className="card-header-flex" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ fontSize: "20px" }}>
                📅 Full Exam Study Plan
                <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", marginLeft: "10px" }}>
                  {schedule.length} days · {schedule.filter((d) => d.isExamDay).length} exam day(s)
                </span>
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                ✅ {completedTasks} / {totalTasks} sessions done ({completionPercentage}%)
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: "140px" }}>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill fill-emerald" style={{ width: `${completionPercentage}%` }} />
                </div>
              </div>
              <button
                onClick={goToToday}
                style={{ fontSize: "12px", fontWeight: "700", padding: "6px 14px", borderRadius: "20px", background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer" }}
              >
                Jump to Today
              </button>
            </div>
          </div>

          {/* REVISION ROUND LEGEND */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
            {[
              { label: "📖 First Study",   cls: "tag-new",      desc: "Round 1 — first encounter" },
              { label: "⚠️ Weak Topic Focus",cls: "tag-weak",     desc: "Priority: allocated 3x slots" },
              { label: "🔄 Revision",      cls: "tag-revision", desc: "Round 2 — revisit topics" },
              { label: "💡 Deep Revision", cls: "tag-practice", desc: "Round 3+ — reinforce memory" },
              { label: "🔥 Exam Prep",     cls: "tag-weak",     desc: "Final 7 days crunch mode" },
            ].map(({ label, cls }) => (
              <span key={label} className={`timeline-tag ${cls}`} style={{ fontSize: "11px" }}>{label}</span>
            ))}
          </div>

          {/* WEEK NAVIGATION */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={goToPrevWeek} disabled={!canPrev}
              style={{ padding: "8px 18px", borderRadius: "10px", border: "1px solid var(--border)", background: canPrev ? "var(--primary)" : "var(--bg-surface)", color: canPrev ? "#fff" : "var(--text-muted)", fontWeight: "700", cursor: canPrev ? "pointer" : "default", transition: "all 0.2s" }}
            >
              ‹ Previous Week
            </button>
            <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-main)" }}>
              Week {currentWeek} of {totalWeeks}
              {weekDays.length > 0 && (
                <span style={{ fontWeight: "400", color: "var(--text-muted)", fontSize: "12px", marginLeft: "8px" }}>
                  ({weekDays[0].dateLabel} — {weekDays[weekDays.length - 1].dateLabel})
                </span>
              )}
            </span>
            <button
              onClick={goToNextWeek} disabled={!canNext}
              style={{ padding: "8px 18px", borderRadius: "10px", border: "1px solid var(--border)", background: canNext ? "var(--primary)" : "var(--bg-surface)", color: canNext ? "#fff" : "var(--text-muted)", fontWeight: "700", cursor: canNext ? "pointer" : "default", transition: "all 0.2s" }}
            >
              Next Week ›
            </button>
          </div>

          {/* DAY TABS FOR CURRENT WEEK */}
          <div className="schedule-day-tabs" style={{ overflowX: "auto" }}>
            {weekDays.map((dayData) => {
              const realIdx = schedule.findIndex((d) => d.date === dayData.date);
              const isActive = activeDayIdx === realIdx;
              return (
                <button
                  key={dayData.date}
                  className={`day-tab-btn ${isActive ? "active" : ""}`}
                  onClick={() => setActiveDayIdx(realIdx)}
                  style={{
                    position: "relative",
                    minWidth: "100px",
                    background: dayData.isExamDay
                      ? "linear-gradient(135deg,#ef444420,#ef444408)"
                      : undefined,
                    borderColor: dayData.isExamDay ? "#ef4444" : undefined,
                  }}
                >
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>{dayData.dayName}</span>
                  <span style={{ display: "block", fontSize: "12px", fontWeight: "700" }}>{dayData.dateLabel}</span>
                  {dayData.isExamDay ? (
                    <span style={{ display: "block", fontSize: "10px", color: "#ef4444", fontWeight: "800", marginTop: "2px" }}>🎯 EXAM</span>
                  ) : (
                    <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)" }}>
                      {dayData.slots.filter((s) => s.completed).length}/{dayData.slots.length} done
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ACTIVE DAY CONTENT */}
          {activeDay && (
            <div style={{ marginTop: "20px" }}>
              {/* Day header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h4 style={{ fontSize: "17px", fontWeight: "800", margin: 0 }}>
                    {activeDay.dayName}, {activeDay.dateLabel}
                    {activeDay.isExamDay && (
                      <span style={{ marginLeft: "10px", fontSize: "13px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440", borderRadius: "20px", padding: "2px 12px", fontWeight: "700" }}>
                        🎯 EXAM DAY
                      </span>
                    )}
                  </h4>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {activeDay.daysLeft} day(s) remaining until last exam
                  </p>
                </div>
                {activeDay.daysLeft <= 7 && !activeDay.isExamDay && (
                  <span style={{ fontSize: "12px", fontWeight: "700", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440", borderRadius: "20px", padding: "4px 14px" }}>
                    🔥 Final Week — Exam Prep Mode
                  </span>
                )}
              </div>

              {activeDay.isExamDay ? (
                <div style={{ textAlign: "center", padding: "48px 20px", background: "linear-gradient(135deg,#ef444410,#fca5a508)", borderRadius: "var(--radius-md)", border: "2px solid #ef444430" }}>
                  <div style={{ fontSize: "52px", marginBottom: "12px" }}>🎯</div>
                  <h3 style={{ color: "#ef4444", fontSize: "22px", marginBottom: "8px" }}>Exam Day!</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "360px", margin: "0 auto" }}>
                    {activeDay.examBadges.join(" & ")} — No new study sessions scheduled. Rest well, review quick notes, and give your best!
                  </p>
                </div>
              ) : (
                activeDay.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="timeline-slot-card"
                    style={{ opacity: slot.completed ? 0.6 : 1, background: slot.completed ? "#f8fafc" : "#ffffff" }}
                  >
                    <div className="slot-time-badge">{slot.time}</div>

                    <div className="slot-topic-details">
                      <h4 style={{ textDecoration: slot.completed ? "line-through" : "none" }}>{slot.topic}</h4>
                      <div className="slot-topic-meta">
                        <span className="subject-name-tag">{slot.subject}</span>
                        <span className="exam-date-tag">Exam {new Date(`${slot.examDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span className="confidence-tag">{slot.confidence} confidence</span>
                        <span className="weightage-tag">{slot.moduleMarks} marks</span>
                        <span className={`timeline-tag ${slot.tagClass}`}>{slot.type}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Round {slot.round}</span>
                        <span>⏱️ {slot.duration}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                        <input
                          type="checkbox"
                          className="checkbox-mark-done"
                          checked={slot.completed}
                          onChange={() => toggleTaskDone(activeDayIdx, slot.id)}
                        />
                        {slot.completed ? "Done ✓" : "Mark Done"}
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Timetable;
