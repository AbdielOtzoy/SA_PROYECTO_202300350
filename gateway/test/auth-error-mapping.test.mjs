import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gateway = readFileSync('src/common/grpc/grpc-error.ts', 'utf8');
const identity = readFileSync('../services/identity/src/identity/identity.service.ts', 'utf8');

test('traduce credenciales inválidas a 401 y datos inválidos a 400', () => {
  assert.match(identity, /GrpcStatus\.UNAUTHENTICATED/);
  assert.match(identity, /GrpcStatus\.INVALID_ARGUMENT/);
  assert.match(gateway, /new GrpcHttpException\(code, 401/);
  assert.match(gateway, /new GrpcHttpException\(code, 400/);
});

test('traduce correo duplicado a 409 sin propagar errores internos', () => {
  assert.match(identity, /GrpcStatus\.ALREADY_EXISTS/);
  assert.match(gateway, /new GrpcHttpException\(code, 409/);
  assert.match(gateway, /new GrpcHttpException\(code, 502/);
});
