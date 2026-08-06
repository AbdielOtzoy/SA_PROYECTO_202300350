from __future__ import annotations

from typing import Protocol


class CacheClient(Protocol):
    def get(self, key: str) -> str | None: ...

    def setex(self, key: str, time: int, value: str) -> object: ...

    def delete(self, key: str) -> object: ...


class AnalyticsCache:
    def __init__(self, client: CacheClient):
        self._client = client

    def get(self, key: str) -> str | None:
        return self._client.get(key)

    def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self._client.setex(key, ttl_seconds, value)

    def invalidate_current(self) -> None:
        self._client.delete('analytics:most-viewed:current')
