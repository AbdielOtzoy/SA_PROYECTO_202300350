import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseCsv } = require('../src/catalog/csv.ts');

test('parsea encabezados, comillas y comas internas', () => {
  const rows = parseCsv('name,description\nCurso,"Tema, avanzado"\n', ['name', 'description']);
  assert.deepEqual(rows, [{ name: 'Curso', description: 'Tema, avanzado' }]);
});

test('rechaza columnas obligatorias ausentes', () => {
  assert.throws(() => parseCsv('name\nCurso\n', ['name', 'code']), /Faltan columnas/);
});
