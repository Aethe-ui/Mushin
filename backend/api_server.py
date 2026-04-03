from __future__ import annotations

import json
import logging
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict

from mushin_calculator import analyze_day
from prisma_storage import PrismaStorage

HOST = "127.0.0.1"
PORT = 8000
STORAGE = PrismaStorage()
MAX_REQUEST_BYTES = int(os.getenv("MAX_REQUEST_BYTES", "1048576"))
ALLOWED_ORIGINS_ENV = os.getenv(
	"ALLOWED_ORIGINS",
	"http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:3000,http://localhost:3000",
)
ALLOWED_ORIGINS = {
	origin
	for origin in (item.strip() for item in ALLOWED_ORIGINS_ENV.split(","))
	if origin
}
LOGGER = logging.getLogger(__name__)

def analyze_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
	user_id = str(payload.get("user_id", "")).strip()
	if not user_id:
		raise ValueError("user_id is required.")
	input_payload = dict(payload)
	input_payload["user_id"] = user_id

	if not isinstance(input_payload.get("previous_days"), list) or not input_payload.get("previous_days"):
		try:
			input_payload["previous_days"] = STORAGE.fetch_last_three_days(user_id)
		except Exception:
			input_payload["previous_days"] = []

	result = analyze_day(input_payload)

	try:
		STORAGE.store_day(
			user_id=user_id,
			focus_hours=float(input_payload.get("focus_hours", 0)),
			workout_minutes=float(input_payload.get("workout_minutes", 0)),
			rest_hours=float(input_payload.get("rest_hours", 0)),
			score=float(result["score"]),
			xp=int(result["xp"]),
			state=str(result["state"]),
			explanation=str(result["explanation"]),
		)
	except Exception:
		LOGGER.exception("Storage write failed for user_id=%s", user_id)
		if STORAGE.enabled:
			result["storage_warning"] = "Storage write failed."
		else:
			result["storage_warning"] = "Storage write skipped (storage disabled)."

	result["history_source"] = "prisma" if STORAGE.enabled else "request"
	return result


class MushinAPIHandler(BaseHTTPRequestHandler):
	def _set_headers(self, status_code: int = 200) -> None:
		self.send_response(status_code)
		self.send_header("Content-Type", "application/json")
		origin = self.headers.get("Origin", "").strip()
		if origin in ALLOWED_ORIGINS:
			self.send_header("Access-Control-Allow-Origin", origin)
		self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.send_header("Vary", "Origin")
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
			if content_length < 0:
				raise ValueError("Invalid Content-Length.")
			if content_length > MAX_REQUEST_BYTES:
				self._set_headers(413)
				self.wfile.write(json.dumps({"error": "Payload too large"}).encode("utf-8"))
				return
			raw = self.rfile.read(content_length)
			payload = json.loads(raw.decode("utf-8")) if raw else {}
			if not isinstance(payload, dict):
				raise ValueError("Request body must be a JSON object.")
			result = analyze_payload(payload)
			self._set_headers(200)
			self.wfile.write(json.dumps(result).encode("utf-8"))
		except (ValueError, TypeError) as exc:
			self._set_headers(400)
			self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))
		except Exception:  # noqa: BLE001
			self._set_headers(500)
			self.wfile.write(json.dumps({"error": "Internal server error"}).encode("utf-8"))


def run_server(host: str = HOST, port: int = PORT) -> None:
	server = ThreadingHTTPServer((host, port), MushinAPIHandler)
	print(f"Mushin backend running at http://{host}:{port}")
	server.serve_forever()


if __name__ == "__main__":
	run_server()
