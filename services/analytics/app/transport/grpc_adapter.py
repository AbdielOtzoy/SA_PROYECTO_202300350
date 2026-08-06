from __future__ import annotations

import analytics_pb2
import analytics_pb2_grpc
import grpc

from ..analytics.models import MostViewedItem, MostViewedResult
from ..analytics.service import AnalyticsService, ResultCodec
from ..common.auth import AuthorizationError, Authorizer


class ProtobufResultCodec(ResultCodec):
    def encode(self, result: MostViewedResult) -> str:
        reply = _to_reply(result)
        return reply.SerializeToString().hex()

    def decode(self, value: str) -> MostViewedResult:
        reply = analytics_pb2.MostViewedReply.FromString(bytes.fromhex(value))
        return MostViewedResult(
            items=tuple(MostViewedItem(recording_id=item.recording_id, views=item.views) for item in reply.items)
        )


class AnalyticsGrpcAdapter(analytics_pb2_grpc.AnalyticsServiceServicer):
    def __init__(self, service: AnalyticsService, authorizer: Authorizer):
        self._service = service
        self._authorizer = authorizer

    def RecordView(self, request: analytics_pb2.ViewRequest, context: grpc.ServicerContext) -> analytics_pb2.Empty:
        self._authorize(context)
        self._service.record_view(request.user_id, request.recording_id)
        return analytics_pb2.Empty()

    def MostViewed(
        self,
        request: analytics_pb2.MostViewedRequest,
        context: grpc.ServicerContext,
    ) -> analytics_pb2.MostViewedReply:
        self._authorize(context)
        result = self._service.most_viewed(request.week_start)
        return _to_reply(result)

    def _authorize(self, context: grpc.ServicerContext) -> None:
        try:
            self._authorizer.authorize(context.invocation_metadata())
        except AuthorizationError as error:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, str(error))


def _to_reply(result: MostViewedResult) -> analytics_pb2.MostViewedReply:
    return analytics_pb2.MostViewedReply(
        items=[analytics_pb2.MostViewedItem(recording_id=item.recording_id, views=item.views) for item in result.items]
    )
