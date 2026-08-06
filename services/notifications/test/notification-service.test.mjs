import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { NotificationsService } = require('../src/notifications/notifications.service.ts');

test('notificaciones envía correo y persiste la cola', async () => {
  const sent = [];
  const mailer = { sendMail: async (message) => sent.push(message) };
  const queued = [];
  const repository = { enqueue: async (request) => queued.push(request) };
  const service = new NotificationsService(repository, mailer);
  const result = await service.send({ user_id: 'u-1', recipient: 'u@ing.usac.edu.gt', subject: 'Hola', body: 'Texto' });
  assert.deepEqual(result, { accepted: true });
  assert.equal(sent[0].to, 'u@ing.usac.edu.gt');
  assert.equal(queued.length, 1);
});
