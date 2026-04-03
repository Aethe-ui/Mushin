from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from math import exp
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

	TARGET_DEEP_WORK_MINUTES = 240
	IDEAL_SESSION_MINUTES = 50
	SESSION_STD_MINUTES = 25
	PERFORMANCE_COMPONENT_WEIGHTS = {
		"focus_efficiency": 0.30,
		"session_quality": 0.30,
		"deep_work": 0.30,
		"interruption_resilience": 0.10,
	}

	@staticmethod
	def _clamp(value: float, lower: float, upper: float) -> float:
		return max(lower, min(value, upper))

	@staticmethod
	def focus_efficiency_score(total_focus_minutes: int, total_break_minutes: int) -> float:
		total_focus = max(0, int(total_focus_minutes))
		total_break = max(0, int(total_break_minutes))
		total_session_time = total_focus + total_break
		if total_session_time <= 0:
			return 0.0
		return (total_focus / total_session_time) * 100.0

	@staticmethod
	def session_quality_score(session: FocusSession) -> float:
		rating_norm = MetricsCalculator._clamp(float(session.focus_rating) / 5.0, 0.0, 1.0)
		duration = max(0.0, float(session.duration_minutes))
		if duration <= 0:
			return 0.0
		z = (duration - MetricsCalculator.IDEAL_SESSION_MINUTES) / MetricsCalculator.SESSION_STD_MINUTES
		duration_quality = exp(-0.5 * (z**2))
		return (rating_norm * duration_quality) * 100.0

	@classmethod
	def average_session_quality_score(cls, sessions: Iterable[FocusSession]) -> float:
		session_list = list(sessions)
		if not session_list:
			return 0.0

		total_weight = sum(max(0.0, float(s.duration_minutes)) for s in session_list)
		if total_weight <= 0:
			return 0.0

		weighted_score = sum(
			cls.session_quality_score(s) * max(0.0, float(s.duration_minutes))
			for s in session_list
		)
		return weighted_score / total_weight

	@classmethod
	def normalized_session_quality_score(cls, sessions: Iterable[FocusSession]) -> float:
		return cls._clamp(cls.average_session_quality_score(sessions), 0.0, 100.0)

	@classmethod
	def deep_work_score(cls, sessions: Iterable[FocusSession]) -> float:
		session_list = list(sessions)
		if not session_list:
			return 0.0

		total_focus = sum(max(0.0, float(s.duration_minutes)) for s in session_list)
		if total_focus <= 0:
			return 0.0

		deep_minutes = sum(
			max(0.0, float(s.duration_minutes))
			for s in session_list
			if s.duration_minutes >= 45
		)
		volume_factor = 1.0 - exp(-(total_focus / float(cls.TARGET_DEEP_WORK_MINUTES)))
		deep_ratio = deep_minutes / total_focus

		score = (0.70 * volume_factor) + (0.30 * deep_ratio)
		return cls._clamp(score * 100.0, 0.0, 100.0)

	@classmethod
	def normalized_deep_work_score(cls, sessions: Iterable[FocusSession]) -> float:
		return cls._clamp(cls.deep_work_score(sessions), 0.0, 100.0)

	@staticmethod
	def interruption_penalty_score(total_interruptions: int) -> float:
		return MetricsCalculator.interruption_resilience_score(total_interruptions, 0)

	@staticmethod
	def interruption_resilience_score(total_interruptions: int, total_focus_minutes: int) -> float:
		interruptions = max(0, int(total_interruptions))
		focus_minutes = max(0, int(total_focus_minutes))
		if focus_minutes <= 0:
			return 100.0 if interruptions == 0 else 0.0

		focus_hours = max(focus_minutes / 60.0, 1e-6)
		interruptions_per_hour = interruptions / focus_hours
		score = 100.0 / (1.0 + (interruptions_per_hour**1.2))
		return MetricsCalculator._clamp(score, 0.0, 100.0)

	@classmethod
	def daily_performance_score(
		cls,
		total_focus_minutes: int,
		total_break_minutes: int,
		total_interruptions: int,
		sessions: Iterable[FocusSession],
	) -> float:
		components = cls.performance_components(
			total_focus_minutes=total_focus_minutes,
			total_break_minutes=total_break_minutes,
			total_interruptions=total_interruptions,
			sessions=sessions,
		)
		return components["daily_performance"]

	@classmethod
	def performance_components(
		cls,
		total_focus_minutes: int,
		total_break_minutes: int,
		total_interruptions: int,
		sessions: Iterable[FocusSession],
	) -> dict:
		session_list = list(sessions)
		total_focus = max(0, int(total_focus_minutes))

		if total_focus <= 0:
			return {
				"focus_efficiency": 0.0,
				"session_quality": 0.0,
				"deep_work": 0.0,
				"interruption_resilience": cls.interruption_resilience_score(
					total_interruptions, total_focus
				),
				"fatigue_index": 0.0,
				"fatigue_modifier": 1.0,
				"daily_performance": 0.0,
			}

		fes = cls.focus_efficiency_score(total_focus, total_break_minutes)
		sqs = cls.normalized_session_quality_score(session_list)
		dws = cls.normalized_deep_work_score(session_list)
		ips = cls.interruption_resilience_score(total_interruptions, total_focus)
		fi = cls.fatigue_index(session_list)

		base_score = (
			(cls.PERFORMANCE_COMPONENT_WEIGHTS["focus_efficiency"] * fes)
			+ (cls.PERFORMANCE_COMPONENT_WEIGHTS["session_quality"] * sqs)
			+ (cls.PERFORMANCE_COMPONENT_WEIGHTS["deep_work"] * dws)
			+ (cls.PERFORMANCE_COMPONENT_WEIGHTS["interruption_resilience"] * ips)
		)
		fatigue_modifier = 1.0 - (0.25 * cls._clamp(fi, 0.0, 1.0))
		performance = cls._clamp(base_score * fatigue_modifier, 0.0, 100.0)

		return {
			"focus_efficiency": cls._clamp(fes, 0.0, 100.0),
			"session_quality": cls._clamp(sqs, 0.0, 100.0),
			"deep_work": cls._clamp(dws, 0.0, 100.0),
			"interruption_resilience": cls._clamp(ips, 0.0, 100.0),
			"fatigue_index": cls._clamp(fi, 0.0, 1.0),
			"fatigue_modifier": cls._clamp(fatigue_modifier, 0.0, 1.0),
			"daily_performance": performance,
		}

	@staticmethod
	def fatigue_index(sessions: Iterable[FocusSession]) -> float:
		session_list = list(sessions)
		if not session_list:
			return 0.0

		strain_load = sum(
			((max(0.0, float(s.duration_minutes)) / 60.0) ** 1.25)
			* (1.0 + (max(0.0, float(s.get_interruptions())) / 12.0))
			for s in session_list
		)
		recovery_credit = sum(
			(max(0.0, float(s.break_duration_minutes)) / 15.0) ** 0.8
			for s in session_list
		)
		normalizer = 1.0 + (0.25 * float(len(session_list)))
		raw = max(0.0, strain_load - (0.75 * recovery_credit)) / normalizer
		logistic = 1.0 / (1.0 + exp(-(raw - 1.0)))
		return MetricsCalculator._clamp(logistic, 0.0, 1.0)


def build_daily_log(user_id: str, log_date: date, sessions: Iterable[FocusSession]) -> DailyLog:
	session_list: List[FocusSession] = list(sessions)
	total_focus = sum(s.duration_minutes for s in session_list)
	total_break = sum(s.break_duration_minutes for s in session_list)
	total_interruptions = sum(s.get_interruptions() for s in session_list)

	avg_sqs = MetricsCalculator.average_session_quality_score(session_list)
	fes = MetricsCalculator.focus_efficiency_score(total_focus, total_break)
	dws = MetricsCalculator.deep_work_score(session_list)
	ips = MetricsCalculator.interruption_resilience_score(total_interruptions, total_focus)
	components = MetricsCalculator.performance_components(
		total_focus,
		total_break,
		total_interruptions,
		session_list,
	)
	performance = components["daily_performance"]
	fi = components["fatigue_index"]

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
			"formula_version": "v2.0",
			"component_focus_efficiency": round(components["focus_efficiency"], 2),
			"component_session_quality": round(components["session_quality"], 2),
			"component_deep_work": round(components["deep_work"], 2),
			"component_interruption_resilience": round(
				components["interruption_resilience"], 2
			),
			"fatigue_modifier": round(components["fatigue_modifier"], 3),
			"normalized_session_quality": round(
				MetricsCalculator.normalized_session_quality_score(session_list), 2
			),
			"normalized_deep_work": round(
				MetricsCalculator.normalized_deep_work_score(session_list), 2
			),
			"interruption_resilience": round(
				MetricsCalculator.interruption_resilience_score(total_interruptions, total_focus), 2
			),
		},
	)
