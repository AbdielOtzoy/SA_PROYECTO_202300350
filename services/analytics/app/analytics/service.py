from __future__ import annotations

import datetime as dt
from typing import Protocol

from ..common.cache import AnalyticsCache
from .models import MostViewedQuery, MostViewedResult, ViewEvent
from .repository import ViewRepository


class ResultCodec(Protocol):
    def encode(self, result: MostViewedResult) -> str: ...

    def decode(self, value: str) -> MostViewedResult: ...


class AnalyticsService:
    CACHE_TTL_SECONDS = 300

    def __init__(self, repository: ViewRepository, cache: AnalyticsCache, codec: ResultCodec):
        self._repository = repository
        self._cache = cache
        self._codec = codec

    def record_view(self, user_id: str, recording_id: str, now: dt.datetime | None = None) -> None:
        event = ViewEvent(
            user_id=user_id,
            recording_id=recording_id,
            viewed_at=now or dt.datetime.now(dt.UTC),
        )
        self._repository.record(event)
        self._cache.invalidate_current()

    def most_viewed(
        self,
        week_start: str,
        now: dt.datetime | None = None,
    ) -> MostViewedResult:
        start = MostViewedQuery(week_start).start_datetime(now)
        cache_key = f'analytics:most-viewed:{start.date().isoformat()}'
        cached = self._cache.get(cache_key)
        if cached:
            return self._codec.decode(cached)

        items = self._repository.most_viewed_since(start)
        result = MostViewedResult(items=tuple(items))
        self._cache.set(cache_key, self._codec.encode(result), self.CACHE_TTL_SECONDS)
        return result
