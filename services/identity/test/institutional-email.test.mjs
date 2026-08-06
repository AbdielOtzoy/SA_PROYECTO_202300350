import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const institutionalDomains = ['ingenieria.usac.edu.gt', 'ing.usac.edu.gt'];
const valid = (email) => {
  const hasEmailShape = /^[^\s@]+@[^\s@]+$/.test(email);
  const domain = email.split('@')[1];
  return hasEmailShape && institutionalDomains.includes(domain);
};

test('acepta dominios institucionales', () => {
  assert.equal(valid('persona@ingenieria.usac.edu.gt'), true);
  assert.equal(valid('persona@ing.usac.edu.gt'), true);
});
test('rechaza dominios externos', () => assert.equal(valid('persona@example.com'), false));
test('la asignación de roles usa un procedimiento PostgreSQL real', () => {
  const schema = readFileSync('../../databases/identity/01-schema.sql', 'utf8');
  const service = readFileSync('src/identity/identity.repository.ts', 'utf8');

  assert.match(schema, /CREATE OR REPLACE PROCEDURE set_user_role/);
  assert.doesNotMatch(schema, /FUNCTION set_user_role/);
  assert.match(service, /CALL set_user_role\(\$1,\$2,\$3,\$4\)/);
});
