from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass


@dataclass(frozen=True)
class AnalyticsConfig:
    mongo_url: str
    redis_url: str
    jwt_secret: str
    grpc_bind: str = '0.0.0.0:50054'
    catalog_grpc_address: str = 'catalog:50052'
    identity_grpc_address: str = 'identity:50051'
    playback_grpc_address: str = 'playback:50053'
    grpc_timeout_ms: int = 3000

    @classmethod
    def from_environment(cls, environment: Mapping[str, str] | None = None) -> AnalyticsConfig:
        values = os.environ if environment is None else environment
        return cls(
            mongo_url=cls._required(values, 'ANALYTICS_MONGO_URL'),
            redis_url=cls._required(values, 'REDIS_URL'),
            jwt_secret=cls._required(values, 'JWT_SECRET'),
            grpc_bind=values.get('ANALYTICS_GRPC_BIND', '0.0.0.0:50054'),
            catalog_grpc_address=values.get('CATALOG_GRPC_ADDRESS', 'catalog:50052'),
            identity_grpc_address=values.get('IDENTITY_GRPC_ADDRESS', 'identity:50051'),
            playback_grpc_address=values.get('PLAYBACK_GRPC_ADDRESS', 'playback:50053'),
            grpc_timeout_ms=int(values.get('ANALYTICS_GRPC_TIMEOUT_MS', '3000')),
        )

    @staticmethod
    def _required(environment: Mapping[str, str], name: str) -> str:
        value = environment.get(name, '')
        if not value:
            raise RuntimeError(f'Falta la variable de entorno {name}')
        return value
