import datetime as dt
import unittest
from types import SimpleNamespace

import jwt

from app.common.auth import AuthorizationError, JWTAuthenticator


class JWTAuthenticatorTests(unittest.TestCase):
    secret = 'test-secret-with-at-least-32-bytes'

    def setUp(self) -> None:
        self.authenticator = JWTAuthenticator(self.secret)

    def test_requires_a_bearer_token(self) -> None:
        with self.assertRaisesRegex(AuthorizationError, 'JWT interno requerido'):
            self.authenticator.authorize([])

    def test_rejects_invalid_token(self) -> None:
        metadata = [SimpleNamespace(key='authorization', value='Bearer invalid')]
        with self.assertRaisesRegex(AuthorizationError, 'JWT interno inválido'):
            self.authenticator.authorize(metadata)

    def test_accepts_valid_hs256_token(self) -> None:
        token = jwt.encode(
            {'sub': 'user-1', 'exp': dt.datetime.now(dt.UTC) + dt.timedelta(minutes=5)},
            self.secret,
            algorithm='HS256',
        )
        metadata = [SimpleNamespace(key='authorization', value=f'Bearer {token}')]
        self.authenticator.authorize(metadata)


if __name__ == '__main__':
    unittest.main()
