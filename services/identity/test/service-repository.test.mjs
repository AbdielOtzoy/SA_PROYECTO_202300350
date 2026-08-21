import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { IdentityRepository } = require('../src/identity/identity.repository.ts');
const { IdentityService } = require('../src/identity/identity.service.ts');
const { validInstitutionalEmail } = require('../src/identity/validation.ts');

test('la validación acepta sólo dominios institucionales configurados', () => {
  assert.equal(validInstitutionalEmail('Persona@ING.USAC.EDU.GT', ['ing.usac.edu.gt']), true);
  assert.equal(validInstitutionalEmail('persona@example.com', ['ing.usac.edu.gt']), false);
});

test('el repositorio delega el cambio de rol al procedimiento SQL', async () => {
  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [] };
    },
  };
  const repository = new IdentityRepository(pool);
  await repository.changeRole('u-1', 'admin', true, 'admin-1');
  assert.match(calls[0].sql, /CALL set_user_role\(\$1,\$2,\$3,\$4\)/);
  assert.deepEqual(calls[0].values, ['u-1', 'admin', true, 'admin-1']);
});

test('el repositorio filtra inscripciones por semestre, estado y credenciales', async () => {
  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [] };
    },
  };
  const repository = new IdentityRepository(pool);

  await repository.listEnrollments('u-1', '00000000-0000-4000-8000-000000000001', 'active', 'regular');

  assert.match(calls[0].sql, /semester_id=\$2::uuid/);
  assert.match(calls[0].sql, /status=\$3/);
  assert.match(calls[0].sql, /credentials=\$4/);
  assert.deepEqual(calls[0].values, ['u-1', '00000000-0000-4000-8000-000000000001', 'active', 'regular']);
});

test('identidad protege la cuenta solicitada y permite el acceso administrativo', async () => {
  const calls = [];
  const repository = {
    listEnrollments: async (...args) => {
      calls.push(args);
      return [];
    },
  };
  const service = new IdentityService(repository, {});

  await assert.rejects(() => service.enrollments({ user_id: 'student-2' }, 'student-1', false), /Inscripción ajena/);
  await service.enrollments(
    {
      user_id: 'student-2',
      semester: '00000000-0000-4000-8000-000000000001',
      status: 'active',
      credentials: 'regular',
    },
    'admin-1',
    true,
  );
  assert.deepEqual(calls[0], ['student-2', '00000000-0000-4000-8000-000000000001', 'active', 'regular']);
  await assert.rejects(
    () => service.enrollments({ user_id: 'student-1', semester: 'invalid' }, 'student-1', false),
    /UUID válido/,
  );
});
