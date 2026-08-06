from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

import jwt


class MetadataEntry(Protocol):
    key: str
    value: str


class AuthorizationError(Exception):
    """Error de autenticación del JWT interno."""


class Authorizer(Protocol):
    def authorize(self, metadata: Iterable[object]) -> None:
        """Valida la metadata de una llamada gRPC."""


class JWTAuthenticator:
    def __init__(self, secret: str):
        self._secret = secret

    def authorize(self, metadata: Iterable[object]) -> None:
        token = self._bearer_token(metadata)
        if not token:
            raise AuthorizationError('JWT interno requerido')

        try:
            jwt.decode(token, self._secret, algorithms=['HS256'])
        except jwt.PyJWTError as error:
            raise AuthorizationError('JWT interno inválido') from error

    @staticmethod
    def _bearer_token(metadata: Iterable[object]) -> str | None:
        for entry in metadata:
            key = getattr(entry, 'key', None)
            value = getattr(entry, 'value', None)
            if key == 'authorization' and isinstance(value, str) and value.startswith('Bearer '):
                return value[7:]
        return None
