import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const { SessionService } = require('../src/common/auth/session.service.ts');

test('la cookie de sesión usa las banderas obligatorias', () => {
  const sessionService = readFileSync('src/common/auth/session.service.ts', 'utf8');
  const secureCookie = /httpOnly: true,[\s\S]*secure: true,[\s\S]*sameSite: 'strict'/;

  assert.match(sessionService, secureCookie);
});

test('RBAC del Gateway permite gestores académicos y rechaza estudiantes', () => {
  const service = new SessionService({ jwtSecret: 'test-secret' });
  for (const role of ['admin', 'teacher', 'assistant']) {
    const token = jwt.sign({ sub: `user-${role}`, roles: [role], permissions: [] }, 'test-secret');
    assert.doesNotThrow(() => service.requireManager({ cookies: { yousac_session: token }, headers: {} }));
  }
  const studentToken = jwt.sign({ sub: 'student', roles: ['student'], permissions: [] }, 'test-secret');
  assert.throws(
    () => service.requireManager({ cookies: { yousac_session: studentToken }, headers: {} }),
    /rol académico autorizado/,
  );
});
