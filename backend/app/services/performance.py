"""Deterministic, explainable quiz-performance analysis (not a trained ML model)."""

from __future__ import annotations

from collections import Counter
from statistics import mean

PERFORMANCE_THRESHOLDS = ((40, "weak"), (60, "below_average"), (80, "good"), (101, "strong"))


def performance_level(score: float | None) -> str:
    if score is None:
        return "unknown"
    for upper_bound, label in PERFORMANCE_THRESHOLDS:
        if score < upper_bound:
            return label
    return "strong"


def calculate_trend(scores: list[float]) -> str:
    if len(scores) < 2:
        return "not_available"
    recent = scores[-3:]
    change = recent[-1] - recent[0]
    if change >= 8:
        return "improving"
    if change <= -8:
        return "declining"
    return "stable"


def choose_difficulty(level: str, trend: str, confidence: str) -> str:
    base = {"unknown": 1, "weak": 1, "below_average": 2, "good": 3, "strong": 4}[level]
    if trend == "improving":
        base += 1
    elif trend == "declining":
        base -= 1
    # Confidence is a secondary signal: it only nudges by one level.
    if confidence == "weak":
        base -= 1
    elif confidence == "strong":
        base += 1
    return {1: "easy", 2: "easy-medium", 3: "medium", 4: "medium-hard", 5: "hard"}[max(1, min(5, base))]


def calculate_performance(attempts: list[dict], confidence: str) -> dict:
    """Return performance from chronological Firestore attempt documents."""
    scores = [float(item["score"]) for item in attempts if item.get("score") is not None]
    current = scores[-1] if scores else None
    previous = scores[-2] if len(scores) > 1 else None
    wrong_concepts = Counter(
        result.get("concept")
        for item in attempts
        for result in item.get("questionResults", [])
        if not result.get("isCorrect") and result.get("concept")
    )
    weak_areas = [concept for concept, count in wrong_concepts.items() if count >= 2]
    level = performance_level(current)
    trend = calculate_trend(scores)
    return {
        "current_score": round(current, 2) if current is not None else None,
        "previous_score": round(previous, 2) if previous is not None else None,
        "average_score": round(mean(scores), 2) if scores else None,
        "performance_level": level,
        "trend": trend,
        "attempt_count": len(scores),
        "weak_areas": weak_areas,
        "confidence": confidence,
        "next_difficulty": choose_difficulty(level, trend, confidence),
    }
