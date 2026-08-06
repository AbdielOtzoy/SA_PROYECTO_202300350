from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import datetime
from typing import Protocol

from .models import MostViewedItem, ViewEvent


class MongoCollection(Protocol):
    def insert_one(self, document: Mapping[str, object]) -> object: ...

    def aggregate(self, pipeline: list[Mapping[str, object]]) -> Iterable[Mapping[str, object]]: ...


class ViewRepository(Protocol):
    def record(self, event: ViewEvent) -> None: ...

    def most_viewed_since(self, start: datetime) -> tuple[MostViewedItem, ...]: ...


class MongoViewRepository:
    def __init__(self, collection: MongoCollection):
        self._collection = collection

    def record(self, event: ViewEvent) -> None:
        self._collection.insert_one(
            {
                'user_id': event.user_id,
                'recording_id': event.recording_id,
                'viewed_at': event.viewed_at,
            }
        )

    def most_viewed_since(self, start: datetime) -> tuple[MostViewedItem, ...]:
        rows = self._collection.aggregate(
            [
                {'$match': {'viewed_at': {'$gte': start}}},
                {'$group': {'_id': '$recording_id', 'views': {'$sum': 1}}},
                {'$sort': {'views': -1}},
                {'$limit': 10},
            ]
        )
        return tuple(MostViewedItem(recording_id=str(row['_id']), views=int(row['views'])) for row in rows)
