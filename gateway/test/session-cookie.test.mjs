import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('la cookie de sesión usa las banderas obligatorias', () => {
  const sessionService = readFileSync('src/common/auth/session.service.ts', 'utf8');
  const secureCookie = /httpOnly: true,[\s\S]*secure: true,[\s\S]*sameSite: 'strict'/;

  assert.match(sessionService, secureCookie);
});
