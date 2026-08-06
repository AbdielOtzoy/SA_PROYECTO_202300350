import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CatalogRepository } = require('../src/catalog/catalog.repository.ts');

test('el repositorio mapea la recomendación a número', async () => {
  const pool = { query: async () => ({ rows: [{ id: 'r-1', title: 'Álgebra', course: 'MAT', course_code: 'MAT1', school: 'FIUSAC', semester: '1S', unit: '1', topic: 'Vectores', video_path: '/videos/a.mp4', recommendation: '87.5' }] }) };
  const repository = new CatalogRepository(pool);
  const rows = await repository.list({ query: '', school: '', course: '', semester: '' });
  assert.equal(rows[0].recommendation, 87.5);
});
