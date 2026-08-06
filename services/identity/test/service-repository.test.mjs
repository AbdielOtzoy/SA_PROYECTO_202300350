import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { IdentityRepository } = require('../src/identity/identity.repository.ts');
const { validInstitutionalEmail } = require('../src/identity/validation.ts');

test('la validación acepta sólo dominios institucionales configurados', () => {
  assert.equal(validInstitutionalEmail('Persona@ING.USAC.EDU.GT', ['ing.usac.edu.gt']), true);
  assert.equal(validInstitutionalEmail('persona@example.com', ['ing.usac.edu.gt']), false);
});

test('el repositorio delega el cambio de rol al procedimiento SQL', async () => {
  const calls = [];
  const pool = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } };
  const repository = new IdentityRepository(pool);
  await repository.changeRole('u-1', 'admin', true, 'admin-1');
  assert.match(calls[0].sql, /CALL set_user_role\(\$1,\$2,\$3,\$4\)/);
  assert.deepEqual(calls[0].values, ['u-1', 'admin', true, 'admin-1']);
});
