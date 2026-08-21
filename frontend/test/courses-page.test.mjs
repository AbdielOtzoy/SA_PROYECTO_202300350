import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pageSource = await readFile(join(dirname(fileURLToPath(import.meta.url)), '../app/cursos/page.tsx'), 'utf8');

test('el panel de cursos tiene estados de datos, carga, error y lista vacía', () => {
  assert.match(pageSource, /request<EnrollmentsResponse>\(`\/enrollments/);
  assert.match(pageSource, /role="status"/);
  assert.match(pageSource, /role="alert"/);
  assert.match(pageSource, /enrollments\.length === 0/);
  assert.match(pageSource, /enrollments\.map/);
});

test('el panel expone los tres filtros académicos', () => {
  assert.match(pageSource, /<label>\s*Semestre/);
  assert.match(pageSource, /<label>\s*Estado/);
  assert.match(pageSource, /<label>\s*Credenciales/);
  assert.match(pageSource, /value=\{filters\.semester\}/);
  assert.match(pageSource, /value=\{filters\.status\}/);
  assert.match(pageSource, /value=\{filters\.credentials\}/);
  assert.match(pageSource, /params\.set\('semester'/);
  assert.match(pageSource, /params\.set\('status'/);
  assert.match(pageSource, /params\.set\('credentials'/);
});
