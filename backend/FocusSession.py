from __future__ import annotations

from datetime import datetime
from typing import Optional, Union


class FocusSession:
	def __init__(
		self,
		user_id: str,
		duration_minutes: int,
		focus_rating: int,
		break_taken: bool,
		timestamp: Union[str, datetime],
		distractions: Optional[int] = None,
		break_duration_minutes: int = 0,
		task_type: Optional[str] = None,
		sessions_today: int = 0,
		total_focus_time_today: int = 0,
		avg_focus_rating: float = 0.0,
		sessions_streak_days: int = 0,
	) -> None:
		self.user_id = self._validate_user_id(user_id)
		self.duration_minutes = self._validate_duration_minutes(duration_minutes)
		self.focus_rating = self._validate_focus_rating(focus_rating)
		self.distractions = self._validate_distractions(distractions)
		self.break_duration_minutes = self._validate_break_duration_minutes(
			break_duration_minutes
		)
		self.task_type = self._validate_task_type(task_type)
		self.break_taken = self._validate_break_taken(break_taken)
		self.timestamp = self._validate_timestamp(timestamp)

		self._sessions_today = self._validate_non_negative_int(
			sessions_today, "sessions_today"
		)
		self._total_focus_time_today = self._validate_non_negative_int(
			total_focus_time_today, "total_focus_time_today"
		)
		self._avg_focus_rating = self._validate_avg_focus_rating(avg_focus_rating)
		self._sessions_streak_days = self._validate_non_negative_int(
			sessions_streak_days, "sessions_streak_days"
		)

	@staticmethod
	def _validate_user_id(value: str) -> str:
		if not isinstance(value, str) or not value.strip():
			raise ValueError("user_id must be a non-empty string.")
		return value

	@staticmethod
	def _validate_duration_minutes(value: int) -> int:
		if not isinstance(value, int):
			raise ValueError("duration_minutes must be an integer.")
		if value < 10 or value > 180:
			raise ValueError("duration_minutes must be between 10 and 180.")
		return value

	@staticmethod
	def _validate_focus_rating(value: int) -> int:
		if not isinstance(value, int):
			raise ValueError("focus_rating must be an integer.")
		if value < 1 or value > 5:
			raise ValueError("focus_rating must be between 1 and 5.")
		return value

	@staticmethod
	def _validate_distractions(value: Optional[int]) -> Optional[int]:
		if value is None:
			return None
		if not isinstance(value, int):
			raise ValueError("distractions must be an integer when provided.")
		if value < 0 or value > 10:
			raise ValueError("distractions must be between 0 and 10.")
		return value

	@staticmethod
	def _validate_break_taken(value: bool) -> bool:
		if not isinstance(value, bool):
			raise ValueError("break_taken must be a boolean.")
		return value

	@staticmethod
	def _validate_break_duration_minutes(value: int) -> int:
		if not isinstance(value, int):
			raise ValueError("break_duration_minutes must be an integer.")
		if value < 0 or value > 120:
			raise ValueError("break_duration_minutes must be between 0 and 120.")
		return value

	@staticmethod
	def _validate_task_type(value: Optional[str]) -> Optional[str]:
		if value is None:
			return None
		if not isinstance(value, str) or not value.strip():
			raise ValueError("task_type must be a non-empty string when provided.")
		return value.strip()

	@staticmethod
	def _validate_timestamp(value: Union[str, datetime]) -> str:
		if isinstance(value, datetime):
			return value.isoformat()

		if isinstance(value, str):
			iso_value = value.replace("Z", "+00:00")
			try:
				parsed = datetime.fromisoformat(iso_value)
				return parsed.isoformat()
			except ValueError as exc:
				raise ValueError("timestamp must be a valid ISO date string.") from exc

		raise ValueError("timestamp must be a datetime or ISO date string.")

	@staticmethod
	def _validate_non_negative_int(value: int, field_name: str) -> int:
		if not isinstance(value, int):
			raise ValueError(f"{field_name} must be an integer.")
		if value < 0:
			raise ValueError(f"{field_name} must be non-negative.")
		return value

	@staticmethod
	def _validate_avg_focus_rating(value: float) -> float:
		if not isinstance(value, (int, float)):
			raise ValueError("avg_focus_rating must be a number.")
		if value < 1 or value > 5:
			raise ValueError("avg_focus_rating must be between 1 and 5.")
		return float(value)

	def set_sessions_today(self, value: int) -> None:
		self._sessions_today = self._validate_non_negative_int(value, "sessions_today")

	def get_sessions_today(self) -> int:
		return self._sessions_today

	def set_total_focus_time_today(self, value: int) -> None:
		self._total_focus_time_today = self._validate_non_negative_int(
			value, "total_focus_time_today"
		)

	def get_total_focus_time_today(self) -> int:
		return self._total_focus_time_today

	def set_avg_focus_rating(self, value: float) -> None:
		self._avg_focus_rating = self._validate_avg_focus_rating(value)

	def get_avg_focus_rating(self) -> float:
		return self._avg_focus_rating

	def set_sessions_streak_days(self, value: int) -> None:
		self._sessions_streak_days = self._validate_non_negative_int(
			value, "sessions_streak_days"
		)

	def get_sessions_streak_days(self) -> int:
		return self._sessions_streak_days

	def get_interruptions(self) -> int:
		return self.distractions if self.distractions is not None else 0

	def get_session_quality_score(self) -> float:
		return (self.focus_rating * self.duration_minutes) / 5.0

	def get_interruption_penalty(self) -> float:
		return 1.0 / (1.0 + self.get_interruptions())

	def to_dict(self) -> dict:
		return {
			"user_id": self.user_id,
			"duration_minutes": self.duration_minutes,
			"focus_rating": self.focus_rating,
			"distractions": self.distractions,
			"interruptions": self.get_interruptions(),
			"break_taken": self.break_taken,
			"break_duration_minutes": self.break_duration_minutes,
			"task_type": self.task_type,
			"timestamp": self.timestamp,
			"sessions_today": self._sessions_today,
			"total_focus_time_today": self._total_focus_time_today,
			"avg_focus_rating": self._avg_focus_rating,
			"sessions_streak_days": self._sessions_streak_days,
		}
