from __future__ import annotations

import datetime as dt
from dataclasses import dataclass


@dataclass(frozen=True)
class ViewEvent:
    user_id: str
    recording_id: str
    viewed_at: dt.datetime


@dataclass(frozen=True)
class MostViewedQuery:
    week_start: str
    week_end: str = ''

    def start_datetime(self, now: dt.datetime | None = None) -> dt.datetime:
        current = now or dt.datetime.now(dt.UTC)
        return (
            dt.datetime.fromisoformat(self.week_start.replace('Z', '+00:00'))
            if self.week_start
            else current - dt.timedelta(days=7)
        )

    def end_datetime(self, now: dt.datetime | None = None) -> dt.datetime:
        current = now or dt.datetime.now(dt.UTC)
        if self.week_end:
            return dt.datetime.fromisoformat(self.week_end.replace('Z', '+00:00'))
        return current


@dataclass(frozen=True)
class MostViewedItem:
    recording_id: str
    views: int


@dataclass(frozen=True)
class MostViewedResult:
    items: tuple[RecordingSignal | MostViewedItem, ...]


@dataclass(frozen=True)
class RecordingSignal:
    recording_id: str
    title: str = ''
    course_id: str = ''
    course: str = ''
    course_code: str = ''
    school: str = ''
    semester: str = ''
    unit: str = ''
    topic: str = ''
    video_path: str = ''
    recommendation: float = 0.0
    positives: int = 0
    total_votes: int = 0
    has_user_vote: bool = False
    user_vote: bool = False
    professor: str = ''
    views: int = 0


@dataclass(frozen=True)
class TrendingTopic:
    topic: str
    views: int
    recording_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class ExamPeriod:
    id: str
    name: str
    start_at: dt.datetime
    end_at: dt.datetime
    active: bool = False


@dataclass(frozen=True)
class EnrollmentSignal:
    course_id: str
    semester_id: str = ''
    status: str = ''
    credentials: str = ''


@dataclass(frozen=True)
class HistorySignal:
    recording_id: str
    started_at: str = ''
    last_position_seconds: float = 0.0


@dataclass(frozen=True)
class CatalogPage:
    recordings: tuple[RecordingSignal, ...]
    page: int = 1
    page_size: int = 10
    total: int = 0
    total_pages: int = 0
