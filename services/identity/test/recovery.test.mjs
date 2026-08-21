import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { IdentityService } = require('../src/identity/identity.service.ts');

function service(repository = {}) {
  return new IdentityService(
    {
      findResetRecipient: async () => ({ id: 'u-1', email: 'estudiante@ing.usac.edu.gt' }),
      createPasswordResetToken: async (...args) => (repository.created = args),
      consumePasswordReset: async (...args) => (
        (repository.consumed = args),
        { id: 'u-1', email: 'estudiante@ing.usac.edu.gt' }
      ),
      findUser: async () => ({
        id: 'u-1',
        email: 'estudiante@ing.usac.edu.gt',
        full_name: 'Estudiante',
        roles: ['student'],
        permissions: [],
        is_active: true,
      }),
      ...repository,
    },
    {
      emailDomains: ['ingenieria.usac.edu.gt', 'ing.usac.edu.gt'],
      passwordResetTtlMinutes: 30,
      jwtSecret: 'test',
      jwtExpiresIn: '60m',
    },
  );
}

test('genera un token aleatorio y solo persiste su hash', async () => {
  const repository = {};
  const reply = await service(repository).requestPasswordReset({ email: 'ESTUDIANTE@ING.USAC.EDU.GT' });
  assert.equal(reply.accepted, true);
  assert.match(reply.reset_token, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(repository.created[0], 'u-1');
  assert.notEqual(repository.created[1], reply.reset_token);
  assert.equal(repository.created[1].length, 64);
  assert.ok(repository.created[2] instanceof Date);
});

test('el restablecimiento delega la contraseña hasheada y devuelve la cuenta', async () => {
  const repository = {};
  const reply = await service(repository).resetPassword({ token: 'token-recibido', new_password: 'nueva-clave-123' });
  assert.equal(reply.accepted, true);
  assert.equal(reply.user.id, 'u-1');
  assert.equal(repository.consumed[0].length, 64);
  assert.notEqual(repository.consumed[1], 'nueva-clave-123');
});

test('rechaza contraseñas débiles', async () => {
  await assert.rejects(
    () => service().resetPassword({ token: 'token', new_password: 'corta' }),
    /mecanismo o la contraseña/,
  );
});
