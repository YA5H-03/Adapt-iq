/* ─────────────────────────────────────────────────────────────────────────────
   SCHEDULE GENERATOR HELPER
   Generates a full adaptive study plan from today to the last exam date
   with ML-driven weighting, 1-hour sessions, 10-minute breaks, and
   multi-round revision cycles.
───────────────────────────────────────────────────────────────────────────── */

export const SESSION_MINS = 60;
export const BREAK_MINS   = 10;
export const START_HOUR   = 9; // 09:00 AM

export function formatTime(totalMins) {
  const h        = Math.floor(totalMins / 60) % 24;
  const m        = totalMins % 60;
  const period   = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function buildTimeLabel(slotIndex) {
  const startMins = START_HOUR * 60 + slotIndex * (SESSION_MINS + BREAK_MINS);
  const endMins   = startMins + SESSION_MINS;
  return `${formatTime(startMins)} – ${formatTime(endMins)}`;
}

export function dateAddDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function friendlyDate(date) {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Generate full adaptive schedule
 * @param {Array} subjects - List of subjects with confidence (Weak | Average | Strong) and modules
 * @param {number} dailyHours - Target hours per day
 * @returns {Array} generatedDays
 */
export function generateFullSchedule(subjects, dailyHours = 3) {
  if (!subjects || !subjects.length) return [];

  // Build flat topic list: Weak topics appear 3×, Average 2×, Strong 1×
  const rawTopics = subjects.flatMap((subject) =>
    (subject.modules || [])
      .filter((m) => m && m.name && m.name.trim())
      .map((m) => ({
        topic:      m.name.trim(),
        subject:    subject.name?.trim() || "Untitled",
        examDate:   subject.examDate || "",
        confidence: subject.confidence || "Average",
        weightage:  Number(m.weightage) || 0,
        totalMarks: Number(subject.totalMarks) || 0,
      }))
  ).sort((a, b) => new Date(a.examDate) - new Date(b.examDate) || b.weightage - a.weightage);

  if (rawTopics.length === 0) return [];

  // Weighted pool based on ML confidence: Weak = 3x frequency, Average = 2x, Strong = 1x
  const weightOf = { Weak: 3, Average: 2, Strong: 1, Beginner: 3, Intermediate: 2, Advanced: 1 };
  const weightedPool = rawTopics.flatMap((t) =>
    Array(weightOf[t.confidence] || 2).fill(t)
  );

  // Date range calculation
  const validDates = subjects
    .map((s) => s.examDate)
    .filter(Boolean)
    .map((d) => new Date(`${d}T00:00:00`));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalDays = 14; // default fallback if no dates set
  if (validDates.length > 0) {
    const lastExamDate = new Date(Math.max(...validDates));
    if (lastExamDate > today) {
      totalDays = Math.ceil((lastExamDate - today) / (1000 * 60 * 60 * 24));
    }
  }

  const slotsPerDay = Math.max(1, Math.min(10, Math.floor(dailyHours || 3)));
  const poolSize    = weightedPool.length;

  let globalSlotIndex = 0;
  const generatedDays = [];

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const date      = dateAddDays(today, dayOffset);
    const dateStr   = toYMD(date);
    const daysLeft  = totalDays - dayOffset;

    // Check if any subject has exam today
    const isExamDay = subjects.some((s) => s.examDate === dateStr);

    // Build exam badge labels for this date
    const examBadges = subjects
      .filter((s) => s.examDate === dateStr)
      .map((s) => s.name || "Exam");

    const slots = [];

    if (!isExamDay) {
      for (let i = 0; i < slotsPerDay; i++) {
        const topic = weightedPool[globalSlotIndex % poolSize];

        // Determine round & type
        const round = Math.floor(globalSlotIndex / poolSize);
        let type, tagClass;

        if (daysLeft <= 7) {
          type     = "🔥 Exam Prep";
          tagClass = "tag-weak";
        } else if (round === 0) {
          if (topic.confidence === "Weak" || topic.confidence === "Beginner") {
            type     = "⚠️ Weak Topic Focus";
            tagClass = "tag-weak";
          } else {
            type     = "📖 First Study";
            tagClass = "tag-new";
          }
        } else if (round === 1) {
          type     = "🔄 Revision";
          tagClass = "tag-revision";
        } else {
          type     = "💡 Deep Revision";
          tagClass = "tag-practice";
        }

        slots.push({
          id:          `${dayOffset}-${i}`,
          time:        buildTimeLabel(i),
          topic:       topic.topic,
          subject:     topic.subject,
          examDate:    topic.examDate,
          confidence:  topic.confidence,
          weightage:   topic.weightage,
          moduleMarks: topic.weightage,
          type,
          tagClass,
          duration:    "1 hour",
          completed:   false,
          round:       round + 1,
        });

        globalSlotIndex++;
      }
    }

    generatedDays.push({
      date:       dateStr,
      dateLabel:  friendlyDate(date),
      dayName:    DAY_NAMES[date.getDay()],
      daysLeft,
      isExamDay,
      examBadges,
      slots,
    });
  }

  return generatedDays;
}
