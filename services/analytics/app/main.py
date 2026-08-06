from __future__ import annotations

from concurrent import futures

import analytics_pb2_grpc
import grpc
from pymongo import MongoClient
from redis import Redis

from .analytics.repository import MongoViewRepository
from .analytics.service import AnalyticsService
from .common.auth import JWTAuthenticator
from .common.cache import AnalyticsCache
from .common.config import AnalyticsConfig
from .transport.grpc_adapter import AnalyticsGrpcAdapter, ProtobufResultCodec


def create_server(config: AnalyticsConfig | None = None) -> grpc.Server:
    settings = config or AnalyticsConfig.from_environment()
    mongo_client = MongoClient(settings.mongo_url)
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

    repository = MongoViewRepository(mongo_client.get_database().views)
    cache = AnalyticsCache(redis_client)
    service = AnalyticsService(repository, cache, ProtobufResultCodec())
    adapter = AnalyticsGrpcAdapter(service, JWTAuthenticator(settings.jwt_secret))

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=8))
    analytics_pb2_grpc.add_AnalyticsServiceServicer_to_server(adapter, server)
    server.add_insecure_port(settings.grpc_bind)
    return server


def main() -> None:
    server = create_server()
    server.start()
    server.wait_for_termination()


if __name__ == '__main__':
    main()
