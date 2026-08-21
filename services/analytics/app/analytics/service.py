from __future__ import annotations

import datetime as dt
import json
import unicodedata
import uuid
from collections.abc import Mapping
from typing import Protocol, cast

from ..common.cache import AnalyticsCache
from .models import (
    CatalogPage,
    EnrollmentSignal,
    ExamPeriod,
    HistorySignal,
    MostViewedItem,
    MostViewedQuery,
    MostViewedResult,
    RecordingSignal,
    TrendingTopic,
    ViewEvent,
)
from .repository import ViewRepository


class ResultCodec(Protocol):
    def encode(self, result: MostViewedResult) -> str: ...

    def decode(self, value: str) -> MostViewedResult: ...


class AnalyticsSources(Protocol):
    def catalog_page(self, request: Mapping[str, object], token: str) -> CatalogPage: ...

    def recordings(self, user_id: str, token: str) -> tuple[RecordingSignal, ...]: ...

    def enrollments(self, user_id: str, token: str) -> tuple[EnrollmentSignal, ...]: ...

    def history(self, user_id: str, token: str) -> tuple[HistorySignal, ...]: ...


class AnalyticsService:
    CATALOG_CACHE_TTL_SECONDS = 900
    ANALYTICS_CACHE_TTL_SECONDS = 300
    CACHE_TTL_SECONDS = ANALYTICS_CACHE_TTL_SECONDS

    def __init__(
        self,
        repository: ViewRepository,
        cache: AnalyticsCache,
        codec: ResultCodec,
        sources: AnalyticsSources | None = None,
    ):
        self._repository = repository
        self._cache = cache
        self._codec = codec
        self._sources = sources

    def record_view(self, user_id: str, recording_id: str, now: dt.datetime | None = None) -> None:
        event = ViewEvent(
            user_id=user_id,
            recording_id=recording_id,
            viewed_at=self._utc(now or dt.datetime.now(dt.UTC)),
        )
        self._repository.record(event)
        invalidate = getattr(self._cache, 'invalidate_analytics', None)
        if callable(invalidate):
            invalidate()
        else:
            self._cache.invalidate_current()

    def catalog_page(self, request: Mapping[str, object], token: str) -> CatalogPage:
        if self._sources is None:
            raise RuntimeError('Fuentes gRPC de analítica no configuradas')
        normalized = {
            'query': str(request.get('query', '') or ''),
            'school': str(request.get('school', '') or ''),
            'course': str(request.get('course', '') or ''),
            'semester': str(request.get('semester', '') or ''),
            'professor': str(request.get('professor', '') or ''),
            'topic': str(request.get('topic', '') or ''),
            'page': max(1, int(request.get('page', 1) or 1)),
            'page_size': min(10, max(1, int(request.get('page_size', 10) or 10))),
            'user_id': str(request.get('user_id', '') or ''),
        }
        key = f'analytics:catalog:{json.dumps(normalized, sort_keys=True, separators=(",", ":"))}'
        cached = self._cache.get(key)
        if cached:
            return self._catalog_from_json(cached)
        result = self._sources.catalog_page(normalized, token)
        self._cache.set(key, self._catalog_to_json(result), self.CATALOG_CACHE_TTL_SECONDS)
        return result

    def most_viewed(
        self,
        week_start: str,
        now: dt.datetime | str | None = None,
        token: str = '',
        week_end: str = '',
    ) -> MostViewedResult:
        if isinstance(now, str) and not week_end:
            week_end = now
            now = None
        query = MostViewedQuery(week_start, week_end)
        start = self._utc(query.start_datetime(now))
        end = self._utc(query.end_datetime(now))
        self._validate_range(start, end)
        cache_key = (
            f'analytics:most-viewed:{start.date().isoformat()}'
            if not week_end
            else f'analytics:most-viewed:{start.isoformat()}:{end.isoformat()}'
        )
        cached = self._cache.get(cache_key)
        if cached:
            return self._codec.decode(cached)

        counts = self._view_counts(start, end, 10)
        if self._sources is None or not token:
            result = MostViewedResult(items=tuple(counts))
        else:
            catalog = {recording.recording_id: recording for recording in self._sources.recordings('', token)}
            result = MostViewedResult(
                items=tuple(
                    self._with_views(
                        catalog.get(item.recording_id, RecordingSignal(recording_id=item.recording_id)),
                        item.views,
                    )
                    for item in counts
                )
            )
        self._cache.set(cache_key, self._codec.encode(result), self.ANALYTICS_CACHE_TTL_SECONDS)
        return result

    def trending_topics(
        self,
        period_id: str = '',
        start_at: str = '',
        end_at: str = '',
        limit: int = 10,
        token: str = '',
    ) -> tuple[TrendingTopic, ...]:
        period = self._resolve_period(period_id, start_at, end_at)
        requested_limit = min(10, max(1, int(limit or 10)))
        key = (
            f'analytics:trends:{period.id}:{period.start_at.isoformat()}: {period.end_at.isoformat()}:{requested_limit}'
        ).replace(': ', ':')
        cached = self._cache.get(key)
        if cached:
            return tuple(
                TrendingTopic(
                    str(item['topic']),
                    int(item['views']),
                    tuple(str(value) for value in item['recording_ids']),
                )
                for item in json.loads(cached)
            )

        counts = self._view_counts(period.start_at, period.end_at, 10000)
        if self._sources is None or not token:
            catalog: dict[str, RecordingSignal] = {}
        else:
            catalog = {recording.recording_id: recording for recording in self._sources.recordings('', token)}
        grouped: dict[str, tuple[int, list[str]]] = {}
        for count in counts:
            recording = catalog.get(count.recording_id)
            topics = self._recording_topics(recording) if recording else ('sin tema',)
            for topic in topics:
                current_views, recording_ids = grouped.setdefault(topic, (0, []))
                grouped[topic] = (current_views + count.views, recording_ids + [count.recording_id])
        result = tuple(
            TrendingTopic(topic, views, tuple(sorted(recording_ids)))
            for topic, (views, recording_ids) in sorted(grouped.items(), key=lambda item: (-item[1][0], item[0]))[
                :requested_limit
            ]
        )
        self._cache.set(
            key,
            json.dumps(
                [{'topic': item.topic, 'views': item.views, 'recording_ids': item.recording_ids} for item in result]
            ),
            self.ANALYTICS_CACHE_TTL_SECONDS,
        )
        return result

    def top_rated(self, limit: int = 10, token: str = '') -> tuple[RecordingSignal, ...]:
        if self._sources is None:
            return ()
        requested_limit = min(10, max(1, int(limit or 10)))
        key = f'analytics:top-rated:{requested_limit}'
        cached = self._cache.get(key)
        if cached:
            return tuple(self._recording_from_json(item) for item in json.loads(cached))
        result = tuple(
            sorted(
                (recording for recording in self._sources.recordings('', token) if recording.total_votes > 0),
                key=lambda recording: (-recording.recommendation, -recording.total_votes, recording.title.casefold()),
            )[:requested_limit]
        )
        self._cache.set(
            key,
            json.dumps([self._recording_to_dict(item) for item in result]),
            self.ANALYTICS_CACHE_TTL_SECONDS,
        )
        return result

    def recommendations(self, user_id: str, limit: int = 10, token: str = '') -> tuple[RecordingSignal, ...]:
        if self._sources is None:
            return ()
        requested_limit = min(10, max(1, int(limit or 10)))
        key = f'analytics:recommendations:{user_id}:{requested_limit}'
        cached = self._cache.get(key)
        if cached:
            return tuple(self._recording_from_json(item) for item in json.loads(cached))

        enrolled = {enrollment.course_id for enrollment in self._sources.enrollments(user_id, token)}
        history = self._sources.history(user_id, token)
        history_ids = {item.recording_id for item in history}
        recordings = self._sources.recordings(user_id, token)
        interest_topics = {
            topic
            for recording in recordings
            if recording.recording_id in history_ids or (recording.has_user_vote and recording.user_vote)
            for topic in self._recording_topics(recording)
        }
        candidates: list[tuple[float, RecordingSignal]] = []
        for recording in recordings:
            if recording.recording_id in history_ids:
                continue
            score = 0.0
            if recording.course_id in enrolled:
                score += 50.0
            if any(topic in interest_topics and topic != 'sin tema' for topic in self._recording_topics(recording)):
                score += 30.0
            score += max(0.0, min(100.0, recording.recommendation)) * 0.2
            if recording.has_user_vote and not recording.user_vote:
                score -= 40.0
            candidates.append((score, recording))
        result = tuple(
            recording
            for _, recording in sorted(
                candidates,
                key=lambda item: (-item[0], -item[1].recommendation, item[1].title.casefold(), item[1].recording_id),
            )[:requested_limit]
        )
        self._cache.set(
            key,
            json.dumps([self._recording_to_dict(item) for item in result]),
            self.ANALYTICS_CACHE_TTL_SECONDS,
        )
        return result

    def list_exam_periods(self, now: dt.datetime | None = None) -> tuple[ExamPeriod, ...]:
        current = self._utc(now or dt.datetime.now(dt.UTC))
        return tuple(
            ExamPeriod(
                period.id,
                period.name,
                period.start_at,
                period.end_at,
                period.start_at <= current < period.end_at,
            )
            for period in self._repository.list_exam_periods()
        )

    def upsert_exam_period(self, period_id: str, name: str, start_at: str, end_at: str) -> ExamPeriod:
        if not name.strip():
            raise ValueError('El nombre del periodo es obligatorio')
        start = self._parse_iso(start_at)
        end = self._parse_iso(end_at)
        self._validate_range(start, end)
        period = ExamPeriod(period_id or str(uuid.uuid4()), name.strip(), start, end)
        saved = self._repository.upsert_exam_period(period)
        invalidate = getattr(self._cache, 'invalidate_analytics', None)
        if callable(invalidate):
            invalidate()
        current = dt.datetime.now(dt.UTC)
        return ExamPeriod(saved.id, saved.name, saved.start_at, saved.end_at, saved.start_at <= current < saved.end_at)

    def delete_exam_period(self, period_id: str) -> None:
        if not period_id:
            raise ValueError('El identificador del periodo es obligatorio')
        self._repository.delete_exam_period(period_id)
        invalidate = getattr(self._cache, 'invalidate_analytics', None)
        if callable(invalidate):
            invalidate()

    def invalidate_catalog_cache(self) -> None:
        invalidate = getattr(self._cache, 'invalidate_catalog', None)
        if callable(invalidate):
            invalidate()

    def invalidate_analytics_cache(self) -> None:
        invalidate = getattr(self._cache, 'invalidate_analytics', None)
        if callable(invalidate):
            invalidate()

    def _resolve_period(self, period_id: str, start_at: str, end_at: str) -> ExamPeriod:
        if period_id:
            period = next((item for item in self.list_exam_periods() if item.id == period_id), None)
            if period is None:
                raise ValueError('Periodo de examen no encontrado')
            return period
        if start_at or end_at:
            start = self._parse_iso(start_at)
            end = self._parse_iso(end_at)
            self._validate_range(start, end)
            return ExamPeriod('', 'Consulta', start, end)
        current = dt.datetime.now(dt.UTC)
        period = next((item for item in self.list_exam_periods(current) if item.active), None)
        if period is None:
            raise ValueError('No hay un periodo de examen activo')
        return period

    def _view_counts(self, start: dt.datetime, end: dt.datetime, limit: int) -> tuple[MostViewedItem, ...]:
        method = getattr(self._repository, 'view_counts_since', None)
        if callable(method):
            try:
                return tuple(method(start, end, limit))
            except TypeError:
                return tuple(method(start, end))
        return tuple(self._repository.most_viewed_since(start))

    @staticmethod
    def _utc(value: dt.datetime) -> dt.datetime:
        return value.astimezone(dt.UTC) if value.tzinfo else value.replace(tzinfo=dt.UTC)

    @classmethod
    def _parse_iso(cls, value: str) -> dt.datetime:
        if not value:
            raise ValueError('La fecha es obligatoria')
        try:
            parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError as error:
            raise ValueError('La fecha debe estar en formato ISO-8601') from error
        return cls._utc(parsed)

    @staticmethod
    def _validate_range(start: dt.datetime, end: dt.datetime) -> None:
        if end <= start:
            raise ValueError('El final debe ser posterior al inicio')

    @staticmethod
    def _topic_key(value: str) -> str:
        compact = ' '.join(value.split()).casefold()
        normalized = unicodedata.normalize('NFKD', compact)
        return ''.join(character for character in normalized if not unicodedata.combining(character)) or 'sin tema'

    @classmethod
    def _recording_topics(cls, recording: RecordingSignal) -> tuple[str, ...]:
        values = recording.topics or ((recording.topic,) if recording.topic else ())
        normalized = tuple(dict.fromkeys(cls._topic_key(value) for value in values if value.strip()))
        return normalized or ('sin tema',)

    @staticmethod
    def _with_views(recording: RecordingSignal, views: int) -> RecordingSignal:
        return RecordingSignal(**{**recording.__dict__, 'views': views})

    @staticmethod
    def _recording_to_dict(recording: RecordingSignal) -> dict[str, object]:
        return dict(recording.__dict__)

    @staticmethod
    def _recording_from_json(value: Mapping[str, object]) -> RecordingSignal:
        fields = RecordingSignal.__dataclass_fields__
        return RecordingSignal(**{name: value.get(name, field.default) for name, field in fields.items()})

    @classmethod
    def _catalog_to_json(cls, page: CatalogPage) -> str:
        return json.dumps(
            {
                'recordings': [cls._recording_to_dict(item) for item in page.recordings],
                'page': page.page,
                'page_size': page.page_size,
                'total': page.total,
                'total_pages': page.total_pages,
            }
        )

    @classmethod
    def _catalog_from_json(cls, value: str) -> CatalogPage:
        payload = cast(dict[str, object], json.loads(value))
        recordings = cast(list[Mapping[str, object]], payload['recordings'])
        return CatalogPage(
            recordings=tuple(cls._recording_from_json(item) for item in recordings),
            page=int(payload['page']),
            page_size=int(payload['page_size']),
            total=int(payload['total']),
            total_pages=int(payload['total_pages']),
        )
