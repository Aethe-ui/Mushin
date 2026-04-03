from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from math import sqrt
from typing import Iterable, List, Optional

try:
	from .FocusSession import FocusSession
except ImportError:
	from FocusSession import FocusSession


@dataclass
class User:
	id: str
	email: str
	full_name: Optional[str] = None
	avatar_url: Optional[str] = None

	def __post_init__(self) -> None:
		if not isinstance(self.id, str) or not self.id.strip():
			raise ValueError("id must be a non-empty string.")
		if not isinstance(self.email, str) or "@" not in self.email:
			raise ValueError("email must be a valid email address.")


@dataclass
class DailyLog:
	user_id: str
	log_date: date
	session_count: int = 0
	total_focus_minutes: int = 0
	total_break_minutes: int = 0
	total_interruptions: int = 0
	avg_session_quality: float = 0.0
	focus_efficiency_score: float = 0.0
	deep_work_score: float = 0.0
	interruption_penalty_score: float = 0.0
	daily_performance_score: float = 0.0
	fatigue_index: float = 0.0
	meta: dict = field(default_factory=dict)

	def to_dict(self) -> dict:
		return {
			"user_id": self.user_id,
			"log_date": self.log_date.isoformat(),
			"session_count": self.session_count,
			"total_focus_minutes": self.total_focus_minutes,
			"total_break_minutes": self.total_break_minutes,
			"total_interruptions": self.total_interruptions,
			"avg_session_quality": round(self.avg_session_quality, 2),
			"focus_efficiency_score": round(self.focus_efficiency_score, 2),
			"deep_work_score": round(self.deep_work_score, 2),
			"interruption_penalty_score": round(self.interruption_penalty_score, 2),
			"daily_performance_score": round(self.daily_performance_score, 2),
			"fatigue_index": round(self.fatigue_index, 3),
			"meta": self.meta,
		}


class MetricsCalculator:
	"""Phase 1 metrics:
	- Focus Efficiency Score (FES)
	- Session Quality Score (SQS, daily average)
	- Daily Performance (composite)
	- Fatigue Index (FI)
	"""

	MAX_SESSION_MINUTES = 180
	TARGET_DEEP_WORK = 120  # 4 x 30-minute sessions baseline

	@staticmethod
	def focus_efficiency_score(total_focus_minutes: int, total_break_minutes: int) -> float:
		total_session_time = total_focus_minutes + total_break_minutes
		if total_session_time <= 0:
			return 0.0
		return (total_focus_minutes / total_session_time) * 100.0

	@staticmethod
	def session_quality_score(session: FocusSession) -> float:
		return (session.focus_rating * session.duration_minutes) / 5.0

	@classmethod
	def average_session_quality_score(cls, sessions: Iterable[FocusSession]) -> float:
		session_list = list(sessions)
		if not session_list:
			return 0.0
		return sum(cls.session_quality_score(s) for s in session_list) / len(session_list)

	@classmethod
	def normalized_session_quality_score(cls, sessions: Iterable[FocusSession]) -> float:
		avg_sqs = cls.average_session_quality_score(sessions)
		max_sqs = float(cls.MAX_SESSION_MINUTES)
		if max_sqs <= 0:
			return 0.0
		return min(100.0, (avg_sqs / max_sqs) * 100.0)

	@classmethod
	def deep_work_score(cls, sessions: Iterable[FocusSession]) -> float:
		session_list = list(sessions)
		if not session_list:
			return 0.0
		avg_duration = sum(s.duration_minutes for s in session_list) / len(session_list)
		return len(session_list) * avg_duration

	@classmethod
	def normalized_deep_work_score(cls, sessions: Iterable[FocusSession]) -> float:
		dws = cls.deep_work_score(sessions)
		if cls.TARGET_DEEP_WORK <= 0:
			return 0.0
		return min(100.0, (dws / cls.TARGET_DEEP_WORK) * 100.0)

	@staticmethod
	def interruption_penalty_score(total_interruptions: int) -> float:
		if total_interruptions < 0:
			total_interruptions = 0
		return 1.0 / (1.0 + total_interruptions)

	@classmethod
	def daily_performance_score(
		cls,
		total_focus_minutes: int,
		total_break_minutes: int,
		total_interruptions: int,
		sessions: Iterable[FocusSession],
	) -> float:
		fes = cls.focus_efficiency_score(total_focus_minutes, total_break_minutes)
		sqs = cls.normalized_session_quality_score(sessions)
		dws = cls.normalized_deep_work_score(sessions)
		ips = cls.interruption_penalty_score(total_interruptions) * 100.0

		return (0.4 * fes) + (0.3 * sqs) + (0.2 * dws) + (0.1 * ips)

	@staticmethod
	def fatigue_index(sessions: Iterable[FocusSession]) -> float:
		session_list = list(sessions)
		if not session_list:
			return 0.0

		fatigue_accumulation = sum((s.duration_minutes / 60.0) ** 2 for s in session_list)
		recovery = sum(sqrt(float(s.break_duration_minutes)) for s in session_list)
		net_fatigue = max(0.0, fatigue_accumulation - recovery)

		return net_fatigue / (1.0 + len(session_list))


def build_daily_log(user_id: str, log_date: date, sessions: Iterable[FocusSession]) -> DailyLog:
	session_list: List[FocusSession] = list(sessions)
	total_focus = sum(s.duration_minutes for s in session_list)
	total_break = sum(s.break_duration_minutes for s in session_list)
	total_interruptions = sum(s.get_interruptions() for s in session_list)

	avg_sqs = MetricsCalculator.average_session_quality_score(session_list)
	fes = MetricsCalculator.focus_efficiency_score(total_focus, total_break)
	dws = MetricsCalculator.deep_work_score(session_list)
	ips = MetricsCalculator.interruption_penalty_score(total_interruptions)
	performance = MetricsCalculator.daily_performance_score(
		total_focus,
		total_break,
		total_interruptions,
		session_list,
	)
	fi = MetricsCalculator.fatigue_index(session_list)

	return DailyLog(
		user_id=user_id,
		log_date=log_date,
		session_count=len(session_list),
		total_focus_minutes=total_focus,
		total_break_minutes=total_break,
		total_interruptions=total_interruptions,
		avg_session_quality=avg_sqs,
		focus_efficiency_score=fes,
		deep_work_score=dws,
		interruption_penalty_score=ips,
		daily_performance_score=performance,
		fatigue_index=fi,
		meta={
			"normalized_session_quality": round(
				MetricsCalculator.normalized_session_quality_score(session_list), 2
			),
			"normalized_deep_work": round(
				MetricsCalculator.normalized_deep_work_score(session_list), 2
			),
		},
	)
