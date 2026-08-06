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

    @classmethod
    def from_environment(cls, environment: Mapping[str, str] | None = None) -> AnalyticsConfig:
        values = os.environ if environment is None else environment
        return cls(
            mongo_url=cls._required(values, 'ANALYTICS_MONGO_URL'),
            redis_url=cls._required(values, 'REDIS_URL'),
            jwt_secret=cls._required(values, 'JWT_SECRET'),
            grpc_bind=values.get('ANALYTICS_GRPC_BIND', '0.0.0.0:50054'),
        )

    @staticmethod
    def _required(environment: Mapping[str, str], name: str) -> str:
        value = environment.get(name, '')
        if not value:
            raise RuntimeError(f'Falta la variable de entorno {name}')
        return value
