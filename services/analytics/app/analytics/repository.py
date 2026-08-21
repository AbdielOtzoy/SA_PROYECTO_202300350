from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from typing import Any, Protocol

from .models import ExamPeriod, MostViewedItem, ViewEvent


class MongoCollection(Protocol):
    def insert_one(self, document: Mapping[str, object]) -> object: ...

    def aggregate(self, pipeline: list[Mapping[str, object]]) -> Iterable[Mapping[str, object]]: ...

    def find(self, *args: Any, **kwargs: Any) -> Any: ...

    def update_one(self, *args: Any, **kwargs: Any) -> Any: ...

    def delete_one(self, *args: Any, **kwargs: Any) -> Any: ...


class ViewRepository(Protocol):
    def record(self, event: ViewEvent) -> None: ...

    def most_viewed_since(self, start: datetime) -> tuple[MostViewedItem, ...]: ...

    def view_counts_since(self, start: datetime, end: datetime, limit: int = 10) -> tuple[MostViewedItem, ...]: ...

    def list_exam_periods(self) -> tuple[ExamPeriod, ...]: ...

    def upsert_exam_period(self, period: ExamPeriod) -> ExamPeriod: ...

    def delete_exam_period(self, period_id: str) -> None: ...


class MongoViewRepository:
    def __init__(
        self,
        collection: MongoCollection,
        periods: MongoCollection | None = None,
        trends: MongoCollection | None = None,
    ):
        self._collection = collection
        self._periods = periods
        self._trends = trends

    def ensure_indexes(self) -> None:
        """Ensure analytics indexes exist even when Mongo reuses an old volume."""
        self._collection.create_index([('viewed_at', 1), ('recording_id', 1)])
        self._collection.create_index([('recording_id', 1), ('viewed_at', 1)])
        if self._periods is not None:
            self._periods.create_index([('start_at', 1), ('end_at', 1)])
        if self._trends is not None:
            self._trends.create_index([('period_id', 1), ('topic', 1)])

    def record(self, event: ViewEvent) -> None:
        self._collection.insert_one(
            {
                'user_id': event.user_id,
                'recording_id': event.recording_id,
                'viewed_at': event.viewed_at,
            }
        )

    def most_viewed_since(self, start: datetime) -> tuple[MostViewedItem, ...]:
        return self.view_counts_since(start, None)

    def view_counts_since(self, start: datetime, end: datetime | None, limit: int = 10) -> tuple[MostViewedItem, ...]:
        date_filter: dict[str, object] = {'$gte': start}
        if end is not None:
            date_filter['$lt'] = end
        rows = self._collection.aggregate(
            [
                {'$match': {'viewed_at': date_filter}},
                {'$group': {'_id': '$recording_id', 'views': {'$sum': 1}}},
                {'$sort': {'views': -1, '_id': 1}},
                {'$limit': max(1, min(10000, int(limit)))},
            ]
        )
        return tuple(MostViewedItem(recording_id=str(row['_id']), views=int(row['views'])) for row in rows)

    def list_exam_periods(self) -> tuple[ExamPeriod, ...]:
        if self._periods is None:
            return ()
        rows = self._periods.find({}).sort('start_at', -1)
        return tuple(self._period_from_document(row) for row in rows)

    def upsert_exam_period(self, period: ExamPeriod) -> ExamPeriod:
        if self._periods is None:
            raise RuntimeError('Colección de periodos no configurada')
        document = {
            '_id': period.id,
            'name': period.name,
            'start_at': period.start_at,
            'end_at': period.end_at,
        }
        self._periods.update_one({'_id': period.id}, {'$set': document}, upsert=True)
        return period

    def delete_exam_period(self, period_id: str) -> None:
        if self._periods is None:
            raise RuntimeError('Colección de periodos no configurada')
        self._periods.delete_one({'_id': period_id})

    @staticmethod
    def _period_from_document(row: Mapping[str, object]) -> ExamPeriod:
        start = row.get('start_at')
        end = row.get('end_at')
        if not isinstance(start, datetime) or not isinstance(end, datetime):
            raise ValueError('Periodo de examen almacenado con fechas inválidas')
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        if end.tzinfo is None:
            end = end.replace(tzinfo=UTC)
        return ExamPeriod(
            id=str(row.get('_id', row.get('id', ''))),
            name=str(row.get('name', '')),
            start_at=start,
            end_at=end,
        )
