import datetime as dt
import unittest

from app.analytics.models import MostViewedItem, MostViewedResult, ViewEvent
from app.analytics.service import AnalyticsService


class FakeRepository:
    def __init__(self) -> None:
        self.events: list[ViewEvent] = []
        self.starts: list[dt.datetime] = []
        self.items = (MostViewedItem('recording-1', 4),)

    def record(self, event: ViewEvent) -> None:
        self.events.append(event)

    def most_viewed_since(self, start: dt.datetime) -> tuple[MostViewedItem, ...]:
        self.starts.append(start)
        return self.items


class FakeCache:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.set_calls: list[tuple[str, str, int]] = []
        self.invalidated = False

    def get(self, key: str) -> str | None:
        return self.values.get(key)

    def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self.values[key] = value
        self.set_calls.append((key, value, ttl_seconds))

    def invalidate_current(self) -> None:
        self.invalidated = True


class FakeCodec:
    def encode(self, result: MostViewedResult) -> str:
        return '|'.join(f'{item.recording_id}:{item.views}' for item in result.items)

    def decode(self, value: str) -> MostViewedResult:
        recording_id, views = value.split(':')
        return MostViewedResult((MostViewedItem(recording_id, int(views)),))


class AnalyticsServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeRepository()
        self.cache = FakeCache()
        self.service = AnalyticsService(self.repository, self.cache, FakeCodec())

    def test_record_view_persists_and_invalidates_current_cache(self) -> None:
        viewed_at = dt.datetime(2026, 8, 5, tzinfo=dt.UTC)

        self.service.record_view('user-1', 'recording-1', viewed_at)

        self.assertEqual(self.repository.events[0].user_id, 'user-1')
        self.assertEqual(self.repository.events[0].recording_id, 'recording-1')
        self.assertEqual(self.repository.events[0].viewed_at, viewed_at)
        self.assertTrue(self.cache.invalidated)

    def test_most_viewed_queries_repository_and_caches_for_five_minutes(self) -> None:
        now = dt.datetime(2026, 8, 5, tzinfo=dt.UTC)

        result = self.service.most_viewed('', now)

        self.assertEqual(result.items, self.repository.items)
        self.assertEqual(self.repository.starts, [dt.datetime(2026, 7, 29, tzinfo=dt.UTC)])
        self.assertEqual(self.cache.set_calls, [('analytics:most-viewed:2026-07-29', 'recording-1:4', 300)])

    def test_most_viewed_returns_cached_result_without_querying_repository(self) -> None:
        self.cache.values['analytics:most-viewed:2026-08-01'] = 'recording-cached:8'

        result = self.service.most_viewed('2026-08-01T00:00:00Z')

        self.assertEqual(result.items, (MostViewedItem('recording-cached', 8),))
        self.assertEqual(self.repository.starts, [])


if __name__ == '__main__':
    unittest.main()
