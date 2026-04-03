from __future__ import annotations

import json
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from math import isfinite
from typing import Any, Dict, List

from FocusSession import FocusSession
from User import build_daily_log

HOST = "127.0.0.1"
PORT = 8000


def clamp(value: float, lower: float, upper: float) -> float:
	return max(lower, min(value, upper))


def _as_float(value: Any, default: float = 0.0) -> float:
	try:
		parsed = float(value)
		if not isfinite(parsed):
			return default
		return parsed
	except (TypeError, ValueError):
		return default


def _as_int(value: Any, default: int = 0) -> int:
	try:
		if isinstance(value, bool):
			return default
		return int(value)
	except (TypeError, ValueError):
		return default


def _build_sessions(payload: Dict[str, Any]) -> List[FocusSession]:
	user_id = str(payload.get("user_id", "demo-user")).strip() or "demo-user"
	focus_hours = clamp(_as_float(payload.get("focus_hours", 0.0)), 0.0, 16.0)
	workout_minutes = int(clamp(float(_as_int(payload.get("workout_minutes", 0))), 0.0, 360.0))
	rest_hours = clamp(_as_float(payload.get("rest_hours", 0.0)), 0.0, 16.0)

	focus_minutes = max(0, int(round(focus_hours * 60)))
	if focus_minutes <= 0:
		return []

	if 0 < focus_minutes < 10:
		focus_minutes = 10

	ideal_session_minutes = 55
	session_count = max(1, min(8, int(round(focus_minutes / ideal_session_minutes))))

	base_duration = max(10, int(round(focus_minutes / session_count)))
	remaining = focus_minutes

	rating_score = 3.0
	rating_score += (rest_hours - 7.0) * 0.40
	rating_score += min(0.8, workout_minutes / 180.0)
	rating_score -= max(0.0, (focus_hours - 9.0) * 0.30)
	focus_rating = int(round(clamp(rating_score, 1, 5)))

	distraction_base = max(0.0, (7.5 - rest_hours) * 1.6)
	distraction_base += max(0.0, (focus_hours - 6.0) * 0.35)
	distractions = int(clamp(round(distraction_base), 0, 10))

	avg_break = int(clamp(round(7 + (workout_minutes / 30) + max(0.0, (focus_hours - 4.0) * 0.8)), 0, 120))
	timestamp = datetime.utcnow().isoformat()

	sessions: List[FocusSession] = []
	for idx in range(session_count):
		duration = base_duration if idx < session_count - 1 else max(10, remaining)
		duration = int(clamp(duration, 10, 180))
		remaining -= duration
		session = FocusSession(
			user_id=user_id,
			duration_minutes=duration,
			focus_rating=focus_rating,
			break_taken=avg_break > 0,
			timestamp=timestamp,
			distractions=distractions,
			break_duration_minutes=avg_break,
			task_type=str(payload.get("task_type", "deep-work")),
			sessions_today=session_count,
			total_focus_time_today=focus_minutes,
			avg_focus_rating=float(focus_rating),
			sessions_streak_days=_as_int(payload.get("sessions_streak_days", 0), 0),
		)
		sessions.append(session)

	return sessions


def _derive_state(daily_performance_score: float, fatigue_index: float) -> str:
	if daily_performance_score < 45 or fatigue_index >= 0.80:
		return "BURNOUT"
	if daily_performance_score < 70 or fatigue_index >= 0.55:
		return "STRAIN"
	return "NORMAL"


def _state_explanation(state: str, log: Dict[str, Any]) -> str:
	if state == "BURNOUT":
		return (
			"Recovery is lagging behind cognitive load. Reduce session intensity, increase sleep, "
			"and prioritize lighter tasks before your next deep-work block."
		)
	if state == "STRAIN":
		return (
			"Performance is holding but stress indicators are rising. Add longer breaks and aim for "
			"stronger recovery to prevent performance decline."
		)
	return (
		"Focus and recovery are currently balanced. Maintain the rhythm and gradually scale workload "
		"if needed."
	)


def analyze_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
	sessions = _build_sessions(payload)
	user_id = str(payload.get("user_id", "demo-user")).strip() or "demo-user"
	log = build_daily_log(user_id=user_id, log_date=date.today(), sessions=sessions).to_dict()

	performance = float(log["daily_performance_score"])
	fatigue = float(log["fatigue_index"])
	state = _derive_state(performance, fatigue)
	session_count = int(log["session_count"])
	focus_minutes = int(log["total_focus_minutes"])

	xp_base = (performance * 0.95) + (focus_minutes * 0.16)
	xp_consistency_bonus = min(12.0, session_count * 2.0)
	xp_fatigue_penalty = fatigue * 14.0
	xp_gained = int(max(0, round(xp_base + xp_consistency_bonus - xp_fatigue_penalty)))

	return {
		"performance_score": int(round(performance)),
		"xp_gained": xp_gained,
		"state": state,
		"explanation": _state_explanation(state, log),
		"metrics": log,
	}


class MushinAPIHandler(BaseHTTPRequestHandler):
	def _set_headers(self, status_code: int = 200) -> None:
		self.send_response(status_code)
		self.send_header("Content-Type", "application/json")
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.end_headers()

	def do_OPTIONS(self) -> None:  # noqa: N802
		self._set_headers(204)

	def do_GET(self) -> None:  # noqa: N802
		if self.path == "/api/health":
			self._set_headers(200)
			self.wfile.write(json.dumps({"ok": True, "service": "mushin-backend"}).encode("utf-8"))
			return

		self._set_headers(404)
		self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

	def do_POST(self) -> None:  # noqa: N802
		if self.path != "/api/analyze":
			self._set_headers(404)
			self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))
			return

		try:
			content_length = int(self.headers.get("Content-Length", "0"))
			raw = self.rfile.read(content_length)
			payload = json.loads(raw.decode("utf-8")) if raw else {}
			result = analyze_payload(payload)
			self._set_headers(200)
			self.wfile.write(json.dumps(result).encode("utf-8"))
		except (ValueError, TypeError) as exc:
			self._set_headers(400)
			self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
		except Exception as exc:  # noqa: BLE001
			self._set_headers(500)
			self.wfile.write(json.dumps({"error": f"Internal server error: {exc}"}).encode("utf-8"))


def run_server(host: str = HOST, port: int = PORT) -> None:
	server = ThreadingHTTPServer((host, port), MushinAPIHandler)
	print(f"Mushin backend running at http://{host}:{port}")
	server.serve_forever()


if __name__ == "__main__":
	run_server()
