from __future__ import annotations

from math import isfinite
from typing import Any, Dict, List


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _to_float(value: Any, fallback: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback

    if not isfinite(parsed):
        return fallback

    return parsed


def _balance_multiplier(rest_hours: float) -> float:
    if rest_hours >= 7:
        return 1.0
    if rest_hours >= 5:
        return 0.8
    return 0.6


def _has_three_day_strain(previous_days: List[Dict[str, Any]]) -> bool:
    if len(previous_days) < 3:
        return False

    last_three = previous_days[-3:]
    return all(
        _to_float(day.get("focus_hours")) > 6 and _to_float(day.get("rest_hours")) < 6
        for day in last_three
    )


def _state_explanation(state: str) -> str:
    if state == "OPTIMAL":
        return "Great balance of focus and recovery. You're in optimal state."
    if state == "STRAIN":
        return "You're pushing hard but recovery is low. Risk of strain."
    if state == "BURNOUT":
        return "High effort with very low rest. Burnout risk is high."
    return "Decent day, but there's room to improve consistency."


def analyze_day(payload: Dict[str, Any]) -> Dict[str, Any]:
    focus_hours = _clamp(_to_float(payload.get("focus_hours")), 0.0, 12.0)
    workout_minutes = _clamp(_to_float(payload.get("workout_minutes")), 0.0, 180.0)
    rest_hours = _clamp(_to_float(payload.get("rest_hours")), 0.0, 12.0)
    previous_days_raw = payload.get("previous_days", [])
    previous_days = previous_days_raw if isinstance(previous_days_raw, list) else []

    workout_hours = workout_minutes / 60.0
    multiplier = _balance_multiplier(rest_hours)
    raw_score = (focus_hours * 0.6 + workout_hours * 0.4) * multiplier
    performance_score = _clamp(raw_score, 0.0, 10.0)

    strain = _has_three_day_strain(previous_days)
    burnout = strain and focus_hours > 7 and rest_hours < 5

    if burnout:
        state = "BURNOUT"
    elif strain:
        state = "STRAIN"
    elif performance_score > 7:
        state = "OPTIMAL"
    else:
        state = "NORMAL"

    xp = performance_score * 10
    if state == "OPTIMAL":
        xp *= 1.2
    elif state == "STRAIN":
        xp *= 0.8
    elif state == "BURNOUT":
        xp *= 0.5

    return {
        "score": round(performance_score, 2),
        "xp": int(round(xp)),
        "state": state,
        "explanation": _state_explanation(state),
    }
