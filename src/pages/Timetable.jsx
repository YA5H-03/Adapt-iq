import { useState, useEffect } from "react";

function Timetable() {
  const currentSyllabus = JSON.parse(localStorage.getItem("currentSyllabus")) || {};
  const defaultExamDate = currentSyllabus.examDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const defaultTopics = currentSyllabus.syllabusText || `Unit 1: Data Structures & Arrays\nUnit 2: Linked Lists & Stacks\nUnit 3: Binary Trees & Traversal\nUnit 4: Graph Algorithms & BFS/DFS\nUnit 5: Sorting & Dynamic Programming`;
  const defaultModules = defaultTopics.split("\n").filter(Boolean).map((name, index) => ({ id: `module-${index}`, name, weightage: 20 }));
  const defaultConfidence = currentSyllabus.confidence === "Low" ? "Weak" : currentSyllabus.confidence === "Medium" ? "Average" : currentSyllabus.confidence === "High" ? "Strong" : "Average";

  const [subjects, setSubjects] = useState([{ id: crypto.randomUUID(), name: "Computer Science & Data Structures", examDate: defaultExamDate, totalMarks: 100, modules: defaultModules, confidence: defaultConfidence }]);
  const [dailyHours, setDailyHours] = useState(currentSyllabus.dailyHours || 4);

  const [schedule, setSchedule] = useState([]);
  const [activeDayTab, setActiveDayTab] = useState(0);

  const updateSubject = (id, field, value) => {
    setSubjects((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const addSubject = () => {
    setSubjects((items) => [...items, { id: crypto.randomUUID(), name: "", examDate: defaultExamDate, totalMarks: 100, modules: [{ id: crypto.randomUUID(), name: "", weightage: 0 }], confidence: "Average" }]);
  };

  const removeSubject = (id) => {
    setSubjects((items) => items.length > 1 ? items.filter((item) => item.id !== id) : items);
  };

  const updateModule = (subjectId, moduleId, field, value) => {
    setSubjects((items) => items.map((subject) => subject.id !== subjectId ? subject : {
      ...subject,
      modules: subject.modules.map((module) => module.id === moduleId ? { ...module, [field]: value } : module),
    }));
  };

  const addModule = (subjectId) => {
    setSubjects((items) => items.map((subject) => subject.id === subjectId ? {
      ...subject,
      modules: [...subject.modules, { id: crypto.randomUUID(), name: "", weightage: 0 }],
    } : subject));
  };

  const removeModule = (subjectId, moduleId) => {
    setSubjects((items) => items.map((subject) => subject.id === subjectId && subject.modules.length > 1 ? {
      ...subject,
      modules: subject.modules.filter((module) => module.id !== moduleId),
    } : subject));
  };

  const handleGenerateSchedule = () => {
    const topicList = subjects.flatMap((subject) => subject.modules
      .filter((module) => module.name.trim())
      .map((module) => ({
        topic: module.name.trim(), subject: subject.name.trim() || "Untitled subject", examDate: subject.examDate,
        confidence: subject.confidence, weightage: Number(module.weightage) || 0, totalMarks: Number(subject.totalMarks) || 0,
      })))
      .sort((a, b) => new Date(a.examDate) - new Date(b.examDate) || b.weightage - a.weightage);

    if (topicList.length === 0) {
      alert("Please enter syllabus topics to generate your study timetable.");
      return;
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const generatedDays = days.map((dayName, dayIndex) => {
      const slotsCount = Math.max(2, Math.min(5, Math.floor(dailyHours)));
      const timeSlots = ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM", "07:00 PM"];

      const slots = [];
      for (let i = 0; i < slotsCount; i++) {
        const topicIndex = (dayIndex * slotsCount + i) % topicList.length;
        const topicName = topicList[topicIndex];

        let type = "Practice";
        let tagClass = "tag-practice";

        if (topicName.confidence === "Weak" || i % 3 === 0) {
          type = "Weak Topic";
          tagClass = "tag-weak";
        } else if (i % 3 === 1) {
          type = "Revision";
          tagClass = "tag-revision";
        } else if (i % 3 === 2) {
          type = "New Topic";
          tagClass = "tag-new";
        }

        slots.push({
          id: `${dayIndex}-${i}`,
          time: timeSlots[i % timeSlots.length],
          topic: topicName.topic,
          subject: topicName.subject,
          examDate: topicName.examDate,
          confidence: topicName.confidence,
          weightage: topicName.weightage,
          moduleMarks: topicName.weightage,
          type: type,
          tagClass: tagClass,
          duration: `${Math.round((dailyHours * 60) / slotsCount)} mins`,
          completed: false,
        });
      }

      return {
        day: dayName,
        slots: slots,
      };
    });

    setSchedule(generatedDays);
    localStorage.setItem(
      "currentSyllabus",
      JSON.stringify({
        ...currentSyllabus,
        subjects,
        dailyHours,
      })
    );
  };

  useEffect(() => {
    handleGenerateSchedule();
  }, []);

  const toggleTaskDone = (dayIndex, slotId) => {
    const updated = [...schedule];
    const slot = updated[dayIndex].slots.find((s) => s.id === slotId);
    if (slot) {
      slot.completed = !slot.completed;
    }
    setSchedule(updated);
  };

  // Calculate total completed tasks
  let totalTasks = 0;
  let completedTasks = 0;
  schedule.forEach((d) => {
    d.slots.forEach((s) => {
      totalTasks++;
      if (s.completed) completedTasks++;
    });
  });
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <div className="page-header-banner">
        <h1>Smart Plan & Timetable 📅</h1>
        <p>Input your parameters to generate an adaptive, high-impact weekly study schedule.</p>
      </div>

      {/* INPUT PARAMETER FORM */}
      <div className="card-container" style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>
          ⚙️ Study Schedule Generator Controls
        </h3>

        <div className="subjects-control-header">
          <div>
            <h4>Subjects & Exam Dates</h4>
            <p>Add every subject you want included in this timetable.</p>
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
                  <input type="text" className="form-input form-input-no-icon" value={subject.name} onChange={(e) => updateSubject(subject.id, "name", e.target.value)} placeholder="e.g. Data Structures & Algorithms" />
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
                  <div><label>Modules & Marks Weightage</label><small>Enter marks for each module. Higher-mark modules are prioritised in the timetable.</small></div>
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
                <label>Confidence Level for {subject.name || `Subject ${index + 1}`}</label>
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

        <button className="btn-generate-plan" onClick={handleGenerateSchedule}>
          ✨ Generate Smart Plan Now
        </button>
      </div>

      {/* AI ADAPTIVE NOTE */}
      <div
        style={{
          padding: "16px 20px",
          background: "var(--primary-light)",
          border: "1px solid var(--primary-border)",
          borderRadius: "var(--radius-md)",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "20px" }}>✦</span>
        <div>
          <strong style={{ fontSize: "14px", color: "var(--primary-hover)" }}>AI Adaptive Schedule Sync</strong>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Plan includes <strong>{subjects.length} {subjects.length === 1 ? "subject" : "subjects"}</strong> with {dailyHours} hours/day. Weak topics are allocated morning prime focus hours.
          </p>
        </div>
      </div>

      {/* SCHEDULE RESULTS VIEW */}
      {schedule.length > 0 && (
        <div className="generated-schedule-container">
          <div className="card-header-flex" style={{ marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "20px" }}>Weekly Study Timeline</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Completed {completedTasks} of {totalTasks} study sessions ({completionPercentage}%)
              </p>
            </div>

            <div style={{ width: "160px" }}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill fill-emerald" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
          </div>

          {/* DAY TABS */}
          <div className="schedule-day-tabs">
            {schedule.map((dayData, index) => (
              <button
                key={index}
                className={`day-tab-btn ${activeDayTab === index ? "active" : ""}`}
                onClick={() => setActiveDayTab(index)}
              >
                {dayData.day} ({dayData.slots.filter((s) => s.completed).length}/{dayData.slots.length})
              </button>
            ))}
          </div>

          {/* TIMELINE SLOTS FOR ACTIVE DAY */}
          <div>
            {schedule[activeDayTab]?.slots.map((slot) => (
              <div
                key={slot.id}
                className="timeline-slot-card"
                style={{
                  opacity: slot.completed ? 0.6 : 1,
                  background: slot.completed ? "#f8fafc" : "#ffffff",
                }}
              >
                <div className="slot-time-badge">{slot.time}</div>

                <div className="slot-topic-details">
                  <h4 style={{ textDecoration: slot.completed ? "line-through" : "none" }}>{slot.topic}</h4>
                  <div className="slot-topic-meta">
                    <span className="subject-name-tag">{slot.subject}</span>
                    <span className="exam-date-tag">Exam {new Date(`${slot.examDate}T00:00:00`).toLocaleDateString()}</span>
                    <span className="confidence-tag">{slot.confidence} confidence</span>
                    <span className="weightage-tag">{slot.moduleMarks} marks</span>
                    <span className={`timeline-tag ${slot.tagClass}`}>{slot.type}</span>
                    <span>⏱️ {slot.duration}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                    <input
                      type="checkbox"
                      className="checkbox-mark-done"
                      checked={slot.completed}
                      onChange={() => toggleTaskDone(activeDayTab, slot.id)}
                    />
                    {slot.completed ? "Done" : "Mark Done"}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Timetable;
