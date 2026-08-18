import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AnalyticsController } = require('../src/analytics/analytics.controller.ts');
const { AdminController } = require('../src/admin/admin.controller.ts');

function sessionFor(role = 'student') {
  return {
    require: () => ({ token: 'jwt-user', claims: { sub: 'user-1', roles: [role] } }),
    requireAdmin: () => {
      if (role !== 'admin') throw new Error('admin required');
      return { token: 'jwt-admin', claims: { sub: 'admin-1', roles: ['admin'] } };
    },
  };
}

test('recomendaciones propagan el JWT y el usuario autenticado', async () => {
  const calls = [];
  const controller = new AnalyticsController(
    { unary: async (...args) => (calls.push(args), { items: [] }) },
    sessionFor(),
  );

  await controller.recommendations({}, '7');

  assert.deepEqual(calls[0], ['analytics', 'Recommendations', { user_id: 'user-1', limit: 7 }, 'jwt-user']);
});

test('tendencias activas marcan la consulta autenticada no administrativa', async () => {
  const calls = [];
  const controller = new AnalyticsController(
    { unary: async (...args) => (calls.push(args), { items: [] }) },
    sessionFor(),
  );

  await controller.activeTrends({});

  assert.equal(calls[0][0], 'analytics');
  assert.equal(calls[0][1], 'TrendingTopics');
  assert.equal(calls[0][2].active_only, true);
  assert.equal(calls[0][3], 'jwt-user');
});

test('periodos de examen requieren rol admin y se traducen a gRPC', async () => {
  const calls = [];
  const controller = new AdminController(
    { unary: async (...args) => (calls.push(args), { period: {} }) },
    sessionFor('admin'),
    { csvMaxBytes: 1000 },
  );

  await controller.examPeriod(
    {},
    { name: 'Parciales', start_at: '2026-08-01T00:00:00Z', end_at: '2026-08-08T00:00:00Z' },
  );

  assert.deepEqual(calls[0], [
    'analytics',
    'UpsertExamPeriod',
    {
      period: {
        id: '',
        name: 'Parciales',
        start_at: '2026-08-01T00:00:00Z',
        end_at: '2026-08-08T00:00:00Z',
      },
    },
    'jwt-admin',
  ]);

  const studentController = new AdminController({ unary: async () => ({}) }, sessionFor(), { csvMaxBytes: 1000 });
  assert.throws(() => studentController.examPeriods({}), /admin required/);
});
