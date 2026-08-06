import datetime as dt
import unittest

from app.analytics.models import ViewEvent
from app.analytics.repository import MongoViewRepository


class FakeCollection:
    def __init__(self) -> None:
        self.documents: list[dict[str, object]] = []
        self.pipeline: list[dict[str, object]] | None = None

    def insert_one(self, document: dict[str, object]) -> None:
        self.documents.append(document)

    def aggregate(self, pipeline: list[dict[str, object]]) -> list[dict[str, object]]:
        self.pipeline = pipeline
        return [{'_id': 'recording-1', 'views': 3}]


class MongoViewRepositoryTests(unittest.TestCase):
    def test_records_the_view_document(self) -> None:
        collection = FakeCollection()
        repository = MongoViewRepository(collection)
        viewed_at = dt.datetime(2026, 8, 5, tzinfo=dt.UTC)

        repository.record(ViewEvent('user-1', 'recording-1', viewed_at))

        self.assertEqual(
            collection.documents,
            [{'user_id': 'user-1', 'recording_id': 'recording-1', 'viewed_at': viewed_at}],
        )

    def test_aggregates_and_maps_most_viewed_rows(self) -> None:
        collection = FakeCollection()
        repository = MongoViewRepository(collection)
        start = dt.datetime(2026, 8, 1, tzinfo=dt.UTC)

        result = repository.most_viewed_since(start)

        self.assertEqual(result[0].recording_id, 'recording-1')
        self.assertEqual(result[0].views, 3)
        self.assertEqual(collection.pipeline[-1], {'$limit': 10})


if __name__ == '__main__':
    unittest.main()
