import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AuthService } = require('../src/auth/auth.service.ts');
const { GatewayNotificationsService } = require('../src/notifications/notifications.service.ts');

test('la solicitud de recuperación usa un JWT interno y no enumera cuentas', async () => {
  const calls = [];
  const auth = new AuthService(
    {
      unary: async (...args) => {
        calls.push(args);
        if (args[1] === 'RequestPasswordReset') {
          return { accepted: true, user_id: 'u-1', recipient: 'u@ing.usac.edu.gt', reset_token: 'reset-token' };
        }
        return { accepted: true, queued: 1 };
      },
    },
    { frontendUrl: 'https://localhost:3000' },
    { issueInternalToken: (permissions) => `internal:${permissions.join(',')}` },
  );
  const response = await auth.requestRecovery({ email: 'u@ing.usac.edu.gt' });
  assert.equal(response.accepted, true);
  assert.match(response.message, /Si la cuenta existe/);
  assert.equal(calls[0][3], 'internal:identity:recovery,notifications:enqueue');
  assert.match(calls[1][2].params_json, /recuperar\?token=reset-token/);
  assert.equal(calls[1][3], calls[0][3]);
});

test('la recuperación mantiene una respuesta genérica para correos no institucionales', async () => {
  const auth = new AuthService(
    { unary: async () => ({ accepted: true }) },
    { frontendUrl: 'https://localhost:3000' },
    { issueInternalToken: () => 'internal:recovery' },
  );
  const response = await auth.requestRecovery({ email: 'no-es-institucional@example.com' });
  assert.equal(response.accepted, true);
  assert.match(response.message, /Si la cuenta existe/);
});

test('las preferencias se consultan y actualizan con el JWT del usuario', async () => {
  const calls = [];
  const service = new GatewayNotificationsService(
    {
      unary: async (...args) => (
        calls.push(args),
        { new_recording: true, admin_notice: false, recovery: true, security: true }
      ),
    },
    { require: () => ({ token: 'jwt-user', claims: { sub: 'u-1' } }) },
    {},
  );
  await service.preferences({});
  await service.updatePreferences({}, { new_recording: false, admin_notice: true });
  assert.deepEqual(calls[0], ['notifications', 'GetPreferences', { user_id: 'u-1' }, 'jwt-user']);
  assert.equal(calls[1][1], 'UpdatePreferences');
  assert.equal(calls[1][3], 'jwt-user');
});

test('los avisos administrativos resuelven destinatarios por rol o curso y encolan un lote', async () => {
  const calls = [];
  const service = new GatewayNotificationsService(
    {
      unary: async (...args) => {
        calls.push(args);
        if (args[1] === 'ListNotificationRecipients')
          return { recipients: [{ user_id: 'u-1', recipient: 'u@ing.usac.edu.gt' }] };
        if (args[1] === 'ListCourses') return { courses: [{ id: 'course-1', code: 'SA', name: 'Software Avanzado' }] };
        return { queued: 1 };
      },
    },
    { requireAdmin: () => ({ token: 'jwt-admin', claims: { sub: 'admin-1', roles: ['admin'] } }) },
    {},
  );
  const response = await service.announce(
    {},
    { target_type: 'role', target_value: 'student', subject: 'Aviso', body: 'Texto' },
  );
  assert.deepEqual(response, { accepted: true, recipients: 1, queued: 1 });
  assert.equal(calls[0][1], 'ListNotificationRecipients');
  assert.equal(calls[1][1], 'SendBatch');
  assert.equal(calls[1][2].type, 'admin_notice');
  await assert.rejects(
    () => service.announce({}, { target_type: 'role', target_value: 'unknown', subject: 'Aviso', body: 'Texto' }),
    /Rol de audiencia inválido/,
  );
});
