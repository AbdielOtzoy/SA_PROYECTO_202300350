import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CatalogService } = require('../src/catalog/catalog.service.ts');

test('rechaza docentes con correo no institucional', async () => {
  const service = new CatalogService({});
  await assert.rejects(
    () => service.upsertProfessor({ full_name: 'Prueba', email: 'prueba@gmail.com' }),
    /correo debe pertenecer/i,
  );
});

test('acepta docentes con correo institucional', async () => {
  const repository = {
    upsertProfessor: async (input) => ({ id: 'p-1', fullName: input.fullName, email: input.email }),
  };
  const service = new CatalogService(repository);
  const professor = await service.upsertProfessor({ full_name: 'Prueba', email: 'prueba@ingenieria.usac.edu.gt' });
  assert.equal(professor.email, 'prueba@ingenieria.usac.edu.gt');
});
