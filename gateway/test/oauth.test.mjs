import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gateway = readFileSync('src/auth/auth.controller.ts', 'utf8');
const service = readFileSync('src/auth/auth.service.ts', 'utf8');
const oauth = readFileSync('src/auth/oauth.ts', 'utf8');

test('expone inicio y callback OAuth detrás del Gateway', () => {
  assert.match(gateway, /@Get\('auth\/google'\)/);
  assert.match(gateway, /@Get\('auth\/google\/callback'\)/);
  assert.match(service, /generateAuthUrl/);
  assert.match(service, /verifyIdToken/);
  assert.match(service, /OAuthLogin/);
});

test('OAuth valida state y dominios institucionales configurables', () => {
  assert.match(oauth, /createOAuthState/);
  assert.match(oauth, /sameOAuthState/);
  assert.match(oauth, /ingenieria\.usac\.edu\.gt,ing\.usac\.edu\.gt/);
  assert.match(service, /validInstitutionalEmail\(profile\.email\)/);
  assert.match(service, /@ingenieria\.usac\.edu\.gt o @ing\.usac\.edu\.gt/);
});

test('el registro institucional está disponible detrás del Gateway', () => {
  assert.match(gateway, /@Post\('auth\/register'\)/);
  assert.match(service, /validInstitutionalEmail\(email/);
  assert.match(gateway, /this\.session\.set\(response, reply\.token\)/);
});
