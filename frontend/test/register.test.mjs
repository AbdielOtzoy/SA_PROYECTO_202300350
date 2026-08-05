import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const registration = readFileSync('app/registro/page.tsx', 'utf8');
const login = readFileSync('app/page.tsx', 'utf8');

test('el formulario institucional registra contra el Gateway y ofrece OAuth', () => {
  assert.match(registration, /request\('\/auth\/register'/);
  assert.match(registration, /ingenieria\.usac\.edu\.gt/);
  assert.match(registration, /allowedDomains\.includes/);
  assert.match(registration, /router\.push\('\/catalogo'\)/);
  assert.match(registration, /\/api\/auth\/google/);
});

test('el login enlaza el registro institucional', () => assert.match(login, /href="\/registro"/));
