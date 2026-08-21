import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { NotificationsService } = require('../src/notifications/notifications.service.ts');

test('notificaciones encola el correo para el worker', async () => {
  const mailer = { sendMail: async () => undefined };
  const queued = [];
  const repository = { enqueue: async (request) => (queued.push(request), 'queue-1') };
  const service = new NotificationsService(repository);
  const result = await service.send({ user_id: 'u-1', recipient: 'u@ing.usac.edu.gt', subject: 'Hola', body: 'Texto' });
  assert.deepEqual(result, { accepted: true, queue_id: 'queue-1', queued: 1 });
  assert.equal(queued.length, 1);
});

test('el worker renderiza parámetros y registra el envío', async () => {
  const sent = [];
  const mailer = { sendMail: async (message) => sent.push(message) };
  const marked = [];
  const repository = {
    claimPending: async () => [
      {
        id: 'queue-1',
        user_id: 'u-1',
        template_id: 'template-1',
        recipient: 'u@ing.usac.edu.gt',
        attempts: 1,
        params_json: { title: 'Clase 1', course: 'SA', recording_url: 'https://localhost/recording' },
        template_subject: 'Nueva grabación',
        template_body: '<p>{{title}} · {{course}}</p><a href="{{recording_url}}">Ver</a>',
      },
    ],
    markSent: async (...args) => marked.push(args),
    markFailed: async () => assert.fail('no debe fallar'),
  };
  const { NotificationsWorker } = require('../src/notifications/notifications.worker.ts');
  const worker = new NotificationsWorker(
    repository,
    { notificationBatchSize: 100, notificationMaxAttempts: 4, mailSendTimeoutMs: 1000 },
    mailer,
  );
  await worker.process();
  assert.match(sent[0].html, /Clase 1/);
  assert.match(sent[0].html, /https:\/\/localhost\/recording/);
  assert.equal(marked.length, 1);
});
