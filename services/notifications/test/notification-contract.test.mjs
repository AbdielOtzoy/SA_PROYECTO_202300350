import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('el contrato de notificaciones conserva Send y expone cola, preferencias y lotes', () => {
  const proto = readFileSync('../../proto/notifications.proto', 'utf8');
  assert.match(proto, /rpc Send\(SendRequest\)/);
  assert.match(proto, /rpc SendBatch\(SendBatchRequest\)/);
  assert.match(proto, /rpc GetPreferences\(PreferencesRequest\)/);
  assert.match(proto, /rpc UpdatePreferences\(UpdatePreferencesRequest\)/);
  assert.match(proto, /string template_code/);
  assert.match(proto, /string params_json/);
});

test('las preferencias opcionales no afectan correos de seguridad o recuperación', () => {
  const repository = readFileSync('src/notifications/notifications.repository.ts', 'utf8');
  assert.match(repository, /new_recording/);
  assert.match(repository, /admin_notice/);
  assert.match(repository, /OPTIONAL_TYPES/);
  assert.match(repository, /recovery: true/);
  assert.match(repository, /security: true/);
});
