from __future__ import annotations

from typing import Protocol


class CacheClient(Protocol):
    def get(self, key: str) -> str | None: ...

    def setex(self, key: str, time: int, value: str) -> object: ...

    def delete(self, key: str) -> object: ...

    def scan_iter(self, match: str): ...


class AnalyticsCache:
    def __init__(self, client: CacheClient):
        self._client = client

    def get(self, key: str) -> str | None:
        return self._client.get(key)

    def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self._client.setex(key, ttl_seconds, value)

    def invalidate_current(self) -> None:
        self._client.delete('analytics:most-viewed:current')

    def delete_pattern(self, pattern: str) -> None:
        keys = list(self._client.scan_iter(match=pattern))
        for key in keys:
            self._client.delete(str(key))

    def invalidate_analytics(self) -> None:
        for pattern in (
            'analytics:most-viewed:*',
            'analytics:trends:*',
            'analytics:top-rated:*',
            'analytics:recommendations:*',
        ):
            self.delete_pattern(pattern)

    def invalidate_catalog(self) -> None:
        self.delete_pattern('analytics:catalog:*')
