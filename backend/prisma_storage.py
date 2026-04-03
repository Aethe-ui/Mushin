from __future__ import annotations

import json
import os
import subprocess
from datetime import date
from typing import Any, Dict, List


class PrismaStorage:
    def __init__(self) -> None:
        self.backend_dir = os.path.dirname(__file__)
        self.bridge_script = os.path.join(self.backend_dir, "prisma_bridge.js")
        self._load_local_env_file()
        self.database_url = os.getenv("DATABASE_URL", "").strip()
        self.bridge_timeout_seconds = int(os.getenv("PRISMA_BRIDGE_TIMEOUT_SECONDS", "15"))

    def _load_local_env_file(self) -> None:
        env_path = os.path.join(self.backend_dir, ".env")
        if not os.path.exists(env_path):
            return

        with open(env_path, "r", encoding="utf-8") as env_file:
            for line in env_file:
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue

                key, value = stripped.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value

    @property
    def enabled(self) -> bool:
        return bool(self.database_url)

    def _run_bridge(self, payload: Dict[str, Any]) -> Any:
        if not self.enabled:
            return []

        process = subprocess.run(
            ["node", self.bridge_script, json.dumps(payload)],
            check=True,
            capture_output=True,
            text=True,
            cwd=self.backend_dir,
            timeout=self.bridge_timeout_seconds,
        )
        stdout = process.stdout.strip()
        if not stdout:
            return []
        return json.loads(stdout)

    def fetch_last_three_days(self, user_id: str) -> List[Dict[str, Any]]:
        result = self._run_bridge(
            {
                "action": "fetch_last_three_days",
                "user_id": user_id,
            }
        )
        return result if isinstance(result, list) else []

    def store_day(
        self,
        *,
        user_id: str,
        focus_hours: float,
        workout_minutes: float,
        rest_hours: float,
        score: float,
        xp: int,
        state: str,
        explanation: str,
    ) -> None:
        self._run_bridge(
            {
                "action": "store_day",
                "user_id": user_id,
                "entry_date": date.today().isoformat(),
                "focus_hours": focus_hours,
                "workout_minutes": workout_minutes,
                "rest_hours": rest_hours,
                "score": score,
                "xp": xp,
                "state": state,
                "explanation": explanation,
            }
        )
