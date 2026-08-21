from __future__ import annotations

from collections.abc import Mapping

import catalog_pb2
import catalog_pb2_grpc
import grpc
import identity_pb2
import identity_pb2_grpc
import playback_pb2
import playback_pb2_grpc

from ..analytics.models import CatalogPage, EnrollmentSignal, HistorySignal, RecordingSignal


class GrpcAnalyticsSources:
    def __init__(
        self,
        catalog_address: str,
        identity_address: str,
        playback_address: str,
        timeout_ms: int = 3000,
    ):
        self._timeout = max(100, timeout_ms) / 1000
        self._catalog_channel = grpc.insecure_channel(catalog_address)
        self._identity_channel = grpc.insecure_channel(identity_address)
        self._playback_channel = grpc.insecure_channel(playback_address)
        self._catalog = catalog_pb2_grpc.CatalogServiceStub(self._catalog_channel)
        self._identity = identity_pb2_grpc.IdentityServiceStub(self._identity_channel)
        self._playback = playback_pb2_grpc.PlaybackServiceStub(self._playback_channel)

    def catalog_page(self, request: Mapping[str, object], token: str) -> CatalogPage:
        response = self._catalog.ListRecordings(
            catalog_pb2.ListRequest(
                query=str(request.get('query', '')),
                school=str(request.get('school', '')),
                course=str(request.get('course', '')),
                semester=str(request.get('semester', '')),
                page=int(request.get('page', 1) or 1),
                page_size=int(request.get('page_size', 10) or 10),
                professor=str(request.get('professor', '')),
                user_id=str(request.get('user_id', '')),
                topic=str(request.get('topic', '')),
            ),
            metadata=self._metadata(token),
            timeout=self._timeout,
        )
        return CatalogPage(
            recordings=tuple(self._recording(item) for item in response.recordings),
            page=int(response.page),
            page_size=int(response.page_size),
            total=int(response.total),
            total_pages=int(response.total_pages),
        )

    def recordings(self, user_id: str, token: str) -> tuple[RecordingSignal, ...]:
        page = 1
        result: list[RecordingSignal] = []
        while True:
            current = self.catalog_page({'page': page, 'page_size': 10, 'user_id': user_id}, token)
            result.extend(current.recordings)
            if not current.recordings or page >= current.total_pages or current.total_pages == 0:
                return tuple(result)
            page += 1

    def enrollments(self, user_id: str, token: str) -> tuple[EnrollmentSignal, ...]:
        response = self._identity.ListEnrollments(
            identity_pb2.EnrollmentsRequest(user_id=user_id),
            metadata=self._metadata(token),
            timeout=self._timeout,
        )
        return tuple(
            EnrollmentSignal(
                course_id=str(item.course_id),
                semester_id=str(item.semester_id),
                status=str(item.status),
                credentials=str(item.credentials),
            )
            for item in response.enrollments
        )

    def history(self, user_id: str, token: str) -> tuple[HistorySignal, ...]:
        response = self._playback.GetHistory(
            playback_pb2.HistoryRequest(user_id=user_id),
            metadata=self._metadata(token),
            timeout=self._timeout,
        )
        return tuple(
            HistorySignal(
                recording_id=str(item.recording_id),
                started_at=str(item.started_at),
                last_position_seconds=float(item.last_position_seconds),
            )
            for item in response.items
        )

    @staticmethod
    def _metadata(token: str) -> tuple[tuple[str, str], ...]:
        return (('authorization', f'Bearer {token}'),)

    @staticmethod
    def _recording(item: object) -> RecordingSignal:
        return RecordingSignal(
            recording_id=str(getattr(item, 'id', '')),
            title=str(getattr(item, 'title', '')),
            course_id=str(getattr(item, 'course_id', '')),
            course=str(getattr(item, 'course', '')),
            course_code=str(getattr(item, 'course_code', '')),
            school=str(getattr(item, 'school', '')),
            semester=str(getattr(item, 'semester', '')),
            unit=str(getattr(item, 'unit', '')),
            topic=str(getattr(item, 'topic', '')),
            topics=tuple(str(value) for value in getattr(item, 'topics', [])),
            video_path=str(getattr(item, 'video_path', '')),
            recommendation=float(getattr(item, 'recommendation', 0) or 0),
            positives=int(getattr(item, 'positives', 0) or 0),
            total_votes=int(getattr(item, 'total_votes', 0) or 0),
            has_user_vote=bool(getattr(item, 'has_user_vote', False)),
            user_vote=bool(getattr(item, 'user_vote', False)),
            professor=str(getattr(item, 'professor', '')),
        )
