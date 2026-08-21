"""
ML Integration + Feedback Engine
=================================
Loads the pre-trained Decision Tree model (student_performance_model.joblib)
and exposes a single public function:

    get_feedback(data: dict) -> dict

The function:
  1. Converts the raw input dict to a pandas DataFrame (preserving feature order).
  2. Runs the trained model to produce a performance level label.
  3. Applies the deterministic feedback engine to derive accuracy and trend.
  4. Returns a clean JSON-serialisable dict ready for the API response.

This module is designed to be imported by the FastAPI route layer;
it never retrains the model.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model path — resolved relative to this file so it works regardless of cwd.
# ---------------------------------------------------------------------------
_MODEL_DIR = Path(__file__).resolve().parents[2] / "model"
_MODEL_PATH = _MODEL_DIR / "student_performance_model.joblib"

# Feature columns in the exact order the trained Pipeline expects.
# The model is a sklearn Pipeline with a ColumnTransformer that applies:
#   - OneHotEncoder  -> ['subject', 'topic']
#   - OrdinalEncoder -> ['topic_difficulty']
# All three are passed as raw strings; the Pipeline handles encoding internally.
# The `scores` list is used only by the feedback engine, never passed to the model.
_FEATURE_COLUMNS: list[str] = [
    "subject",
    "topic",
    "study_hours",
    "quiz_score",
    "previous_score",
    "attempts",
    "time_taken",
    "days_to_exam",
    "last_studied_days",
    "topic_difficulty",
]

# Normalised label map — ensures the output is always one of the three
# canonical strings regardless of what the model internally stores.
_LABEL_MAP: dict[str, str] = {
    "weak": "Weak",
    "average": "Average",
    "strong": "Strong",
    "Weak": "Weak",
    "Average": "Average",
    "Strong": "Strong",
    # Numeric class indices (in case the model was fitted with integer targets)
    "0": "Weak",
    "1": "Average",
    "2": "Strong",
    0: "Weak",
    1: "Average",
    2: "Strong",
}


# ---------------------------------------------------------------------------
# Model loader — cached for the lifetime of the process.
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_model() -> Any:
    """Load and cache the trained scikit-learn model from disk.

    Raises
    ------
    FileNotFoundError
        If the model file is not present at the expected path.
    RuntimeError
        If joblib cannot deserialise the file.
    """
    if not _MODEL_PATH.exists():
        raise FileNotFoundError(
            f"ML model not found at '{_MODEL_PATH}'. "
            "Place 'student_performance_model.joblib' inside the backend/model/ directory."
        )
    logger.info("Loading ML model from %s", _MODEL_PATH)
    try:
        model = joblib.load(_MODEL_PATH)
    except Exception as exc:
        raise RuntimeError(f"Failed to deserialise model: {exc}") from exc
    logger.info("ML model loaded successfully: %s", type(model).__name__)
    return model


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _encode_input(data: dict) -> pd.DataFrame:
    """Convert the raw input dict to a one-row DataFrame the model can consume.

    The model is a sklearn Pipeline whose ColumnTransformer handles all encoding
    internally (OneHotEncoder for subject/topic, OrdinalEncoder for
    topic_difficulty).  We therefore pass raw string values for those columns
    and let the pipeline do the rest.

    Parameters
    ----------
    data:
        Raw validated input as produced by the Pydantic request model.

    Returns
    -------
    pd.DataFrame
        Single-row DataFrame with the 10 columns in ``_FEATURE_COLUMNS`` order.
    """
    row: dict[str, Any] = {
        "subject": str(data.get("subject", "General")),
        "topic": str(data.get("topic", "General")),
        "study_hours": float(data["study_hours"]),
        "quiz_score": float(data["quiz_score"]),
        "previous_score": float(data["previous_score"]),
        "attempts": int(data["attempts"]),
        "time_taken": float(data["time_taken"]),
        "days_to_exam": int(data["days_to_exam"]),
        "last_studied_days": int(data["last_studied_days"]),
        "topic_difficulty": str(data.get("topic_difficulty", "Medium")),
    }
    return pd.DataFrame([row], columns=_FEATURE_COLUMNS)


def _predict_level(data: dict) -> str:
    """Run the ML model and return a normalised performance label.

    Parameters
    ----------
    data:
        Raw validated input dict.

    Returns
    -------
    str
        One of ``"Weak"``, ``"Average"``, or ``"Strong"``.
    """
    model = _load_model()
    df = _encode_input(data)
    raw_prediction = model.predict(df)[0]
    label = _LABEL_MAP.get(raw_prediction)
    if label is None:
        # Graceful fallback: log and default to "Average".
        logger.warning(
            "Unexpected model output '%s' — defaulting to 'Average'", raw_prediction
        )
        label = "Average"
    return label


def _compute_accuracy(scores: list[float]) -> float:
    """Return the accuracy value as the last element of the scores list.

    Parameters
    ----------
    scores:
        Chronologically ordered list of historical quiz scores.

    Returns
    -------
    float
        The most recent score, or 0.0 when the list is empty.
    """
    return float(scores[-1]) if scores else 0.0


def _compute_trend(scores: list[float], previous_score: float) -> str:
    """Determine performance trend from the scores list and the previous score.

    Rules
    -----
    * If only one score is available -> ``"no trend"``.
    * If last score > previous score  -> ``"improving"``.
    * If last score < previous score  -> ``"declining"``.
    * Otherwise                       -> ``"stable"``.

    Parameters
    ----------
    scores:
        Chronologically ordered list of historical quiz scores.
    previous_score:
        The quiz score from the previous attempt (from the request payload).

    Returns
    -------
    str
        One of ``"improving"``, ``"declining"``, ``"stable"``, or ``"no trend"``.
    """
    if len(scores) < 2:
        return "no trend"

    last_score = scores[-1]
    if last_score > previous_score:
        return "improving"
    if last_score < previous_score:
        return "declining"
    return "stable"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_feedback(data: dict) -> dict:
    """Full ML prediction + feedback engine pipeline.

    This is the single public entry-point consumed by the FastAPI route.

    Parameters
    ----------
    data:
        Validated input dict containing all required fields (see
        ``FeedbackRequest`` in ``models.py``).

    Returns
    -------
    dict
        A JSON-serialisable dict with the following keys::

            {
                "level":    "Weak | Average | Strong",
                "accuracy": 60.0,
                "trend":    "improving | declining | stable | no trend"
            }

    Raises
    ------
    FileNotFoundError
        Propagated from ``_load_model()`` when the model file is absent.
    RuntimeError
        Propagated from ``_load_model()`` on deserialisation failure.
    """
    scores: list[float] = [float(s) for s in data.get("scores", [])]
    previous_score: float = float(data.get("previous_score", 0))

    # Step 1 — ML prediction.
    level = _predict_level(data)

    # Step 2 — Feedback engine.
    accuracy = _compute_accuracy(scores)
    trend = _compute_trend(scores, previous_score)

    logger.debug(
        "Feedback computed | level=%s accuracy=%s trend=%s", level, accuracy, trend
    )

    return {
        "level": level,
        "accuracy": accuracy,
        "trend": trend,
    }
