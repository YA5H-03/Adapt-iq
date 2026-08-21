const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const { headers, ...restOptions } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: { "Content-Type": "application/json", ...headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = Array.isArray(data.detail) ? data.detail.map(d => d.msg).join(', ') : (data.detail || "Something went wrong. Please try again.");
    throw new Error(errorMsg);
  }
  return data;
}

export const registerStudent = (payload) => request("/auth/register", {
  method: "POST", body: JSON.stringify(payload),
});

export const loginStudent = (payload) => request("/auth/login", {
  method: "POST", body: JSON.stringify(payload),
});

export const createSubject = (token, payload) => request("/subjects", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

export const createModule = (token, subjectId, payload) => request(`/subjects/${subjectId}/modules`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

export const generateAdaptiveQuiz = (token, payload) => request("/quiz/generate", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

export const submitAdaptiveQuiz = (token, quizId, answers) => request("/quiz/submit", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ quiz_id: quizId, answers }),
});

/**
 * POST /feedback/recommend
 * Orchestrates ML prediction → Prompt Builder → Gemini and returns
 * { recommendation: string, ml_feedback: { level, accuracy, trend } }
 *
 * @param {object} payload - Student performance data (same contract as POST /feedback)
 */
export const getRecommendation = (payload) => request("/feedback/recommend", {
  method: "POST",
  body: JSON.stringify(payload),
});

