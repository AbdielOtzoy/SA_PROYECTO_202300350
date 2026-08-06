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

    def start_datetime(self, now: dt.datetime | None = None) -> dt.datetime:
        current = now or dt.datetime.now(dt.UTC)
        return (
            dt.datetime.fromisoformat(self.week_start.replace('Z', '+00:00'))
            if self.week_start
            else current - dt.timedelta(days=7)
        )


@dataclass(frozen=True)
class MostViewedItem:
    recording_id: str
    views: int


@dataclass(frozen=True)
class MostViewedResult:
    items: tuple[MostViewedItem, ...]
