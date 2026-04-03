from __future__ import annotations

import json
import os
from datetime import date
from typing import Any, Dict, List
from urllib.parse import quote
from urllib.request import Request, urlopen


class SupabaseStorage:
    """Tiny Supabase REST client for day-level Mushin metrics."""

    def __init__(self) -> None:
        self.url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
        self.table = os.getenv("SUPABASE_MUSHIN_TABLE", "daily_metrics")

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.service_key)

    def _headers(self, prefer: str | None = None) -> Dict[str, str]:
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _request_json(
        self,
        method: str,
        path_with_query: str,
        payload: Dict[str, Any] | List[Dict[str, Any]] | None = None,
    ) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(
            url=f"{self.url}/rest/v1/{path_with_query}",
            data=body,
            method=method,
            headers=self._headers("return=representation" if method != "GET" else None),
        )
        with urlopen(request, timeout=8) as response:  # nosec B310
            raw = response.read().decode("utf-8")
            if not raw:
                return []
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, list) else []

    def fetch_last_three_days(self, user_id: str) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        safe_user = quote(user_id, safe="")
        query = (
            f"{self.table}"
            f"?select=focus_hours,rest_hours,entry_date"
            f"&user_id=eq.{safe_user}"
            f"&order=entry_date.desc"
            f"&limit=3"
        )
        rows = self._request_json("GET", query)
        rows.reverse()
        return [
            {
                "focus_hours": row.get("focus_hours", 0),
                "rest_hours": row.get("rest_hours", 0),
            }
            for row in rows
        ]

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
        if not self.enabled:
            return

        payload = {
            "user_id": user_id,
            "entry_date": date.today().isoformat(),
            "focus_hours": round(float(focus_hours), 2),
            "workout_minutes": round(float(workout_minutes), 2),
            "rest_hours": round(float(rest_hours), 2),
            "score": round(float(score), 2),
            "xp": int(xp),
            "state": state,
            "explanation": explanation,
        }
        self._request_json("POST", self.table, payload=payload)
