import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gateway = readFileSync('src/main.ts', 'utf8');
const oauth = readFileSync('src/oauth.ts', 'utf8');

test('expone inicio y callback OAuth detrás del Gateway', () => {
  assert.match(gateway, /@Get\('auth\/google'\)/);
  assert.match(gateway, /@Get\('auth\/google\/callback'\)/);
  assert.match(gateway, /generateAuthUrl/);
  assert.match(gateway, /verifyIdToken/);
  assert.match(gateway, /OAuthLogin/);
});

test('OAuth valida state y dominios institucionales configurables', () => {
  assert.match(oauth, /createOAuthState/);
  assert.match(oauth, /sameOAuthState/);
  assert.match(oauth, /ingenieria\.usac\.edu\.gt,ing\.usac\.edu\.gt/);
  assert.match(gateway, /validInstitutionalEmail\(email\)/);
  assert.match(gateway, /@ingenieria\.usac\.edu\.gt o @ing\.usac\.edu\.gt/);
});

test('el registro institucional está disponible detrás del Gateway', () => {
  assert.match(gateway, /@Post\('auth\/register'\)/);
  assert.match(gateway, /validInstitutionalEmail\(data\.email \|\| ''\)/);
  assert.match(gateway, /setSession\(res, reply\.token\)/);
});
