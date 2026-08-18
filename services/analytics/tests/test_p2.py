import datetime as dt
import json
import unittest

from app.analytics.models import (
    CatalogPage,
    EnrollmentSignal,
    ExamPeriod,
    HistorySignal,
    MostViewedItem,
    MostViewedResult,
    RecordingSignal,
)
from app.analytics.service import AnalyticsService


class FakeRepository:
    def __init__(self) -> None:
        self.counts = (
            MostViewedItem('r-1', 5),
            MostViewedItem('r-2', 3),
            MostViewedItem('r-3', 1),
        )
        self.periods: list[ExamPeriod] = []
        self.range_calls: list[tuple[dt.datetime, dt.datetime, int]] = []

    def record(self, event) -> None:
        pass

    def most_viewed_since(self, start):
        return self.counts

    def view_counts_since(self, start, end, limit=10):
        self.range_calls.append((start, end, limit))
        return self.counts[:limit]

    def list_exam_periods(self):
        return tuple(self.periods)

    def upsert_exam_period(self, period):
        self.periods = [item for item in self.periods if item.id != period.id] + [period]
        return period

    def delete_exam_period(self, period_id):
        self.periods = [item for item in self.periods if item.id != period_id]


class FakeCache:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.set_calls: list[tuple[str, str, int]] = []
        self.analytics_invalidated = False
        self.catalog_invalidated = False

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value, ttl_seconds):
        self.values[key] = value
        self.set_calls.append((key, value, ttl_seconds))

    def invalidate_current(self):
        self.analytics_invalidated = True

    def invalidate_analytics(self):
        self.analytics_invalidated = True

    def invalidate_catalog(self):
        self.catalog_invalidated = True


class FakeCodec:
    def encode(self, result: MostViewedResult) -> str:
        return json.dumps([item.__dict__ for item in result.items])

    def decode(self, value: str) -> MostViewedResult:
        return MostViewedResult(
            tuple(MostViewedItem(item['recording_id'], item['views']) for item in json.loads(value))
        )


class FakeSources:
    def __init__(self) -> None:
        self.items = (
            RecordingSignal('r-1', 'Vista', 'course-1', 'Álgebra', topic='Álgebra', recommendation=90, total_votes=10),
            RecordingSignal(
                'r-2', 'Derivadas', 'course-1', 'Álgebra', topic=' algebra ', recommendation=80, total_votes=4
            ),
            RecordingSignal('r-3', 'Lógica', 'course-2', 'Lógica', topic='Lógica', recommendation=100, total_votes=0),
        )

    def catalog_page(self, request, token):
        return CatalogPage(self.items, page=1, page_size=10, total=3, total_pages=1)

    def recordings(self, user_id, token):
        if user_id == 'user-1':
            return self.items
        if user_id == '':
            return self.items
        return tuple(item for item in self.items if item.recording_id != 'r-2')

    def enrollments(self, user_id, token):
        return (EnrollmentSignal('course-1' if user_id == 'user-1' else 'course-2'),)

    def history(self, user_id, token):
        return (HistorySignal('r-1'),) if user_id == 'user-1' else ()


class AnalyticsP2Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FakeRepository()
        self.cache = FakeCache()
        self.service = AnalyticsService(self.repository, self.cache, FakeCodec(), FakeSources())

    def test_weekly_aggregation_uses_explicit_exclusive_end(self) -> None:
        result = self.service.most_viewed(
            '2026-08-01T00:00:00Z',
            token='token',
            week_end='2026-08-08T00:00:00Z',
        )

        self.assertEqual(result.items[0].recording_id, 'r-1')
        self.assertEqual(
            self.repository.range_calls[0][:2],
            (
                dt.datetime(2026, 8, 1, tzinfo=dt.UTC),
                dt.datetime(2026, 8, 8, tzinfo=dt.UTC),
            ),
        )

    def test_trends_normalize_topic_and_group_views(self) -> None:
        result = self.service.trending_topics(
            start_at='2026-08-01T00:00:00Z',
            end_at='2026-08-08T00:00:00Z',
            token='token',
        )

        self.assertEqual(result[0].topic, 'algebra')
        self.assertEqual(result[0].views, 8)
        self.assertEqual(result[0].recording_ids, ('r-1', 'r-2'))

    def test_top_rated_excludes_recordings_without_votes(self) -> None:
        result = self.service.top_rated(token='token')

        self.assertEqual([item.recording_id for item in result], ['r-1', 'r-2'])

    def test_recommendations_are_deterministic_and_user_specific(self) -> None:
        first_user = self.service.recommendations('user-1', token='token')
        second_user = self.service.recommendations('user-2', token='token')

        self.assertEqual([item.recording_id for item in first_user], ['r-2', 'r-3'])
        self.assertEqual([item.recording_id for item in second_user], ['r-3', 'r-1'])

    def test_catalog_cache_uses_nine_hundred_seconds(self) -> None:
        request = {'page': 1, 'page_size': 10, 'user_id': 'user-1'}

        self.service.catalog_page(request, 'token')

        self.assertEqual(self.cache.set_calls[-1][2], 900)

    def test_period_validation_rejects_reversed_range(self) -> None:
        with self.assertRaisesRegex(ValueError, 'posterior'):
            self.service.upsert_exam_period('p-1', 'Parciales', '2026-08-10T00:00:00Z', '2026-08-01T00:00:00Z')

    def test_period_creation_reports_current_active_state(self) -> None:
        result = self.service.upsert_exam_period(
            'p-1', 'Periodo vigente', '2020-01-01T00:00:00Z', '2030-01-01T00:00:00Z'
        )

        self.assertTrue(result.active)


if __name__ == '__main__':
    unittest.main()
