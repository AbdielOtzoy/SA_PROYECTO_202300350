import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { GrpcErrorMapper } = require('../src/common/grpc/grpc-error.ts');

test('mapea códigos gRPC a los estados HTTP documentados', () => {
  const mapper = new GrpcErrorMapper();
  assert.equal(mapper.toHttp({ code: 3, details: 'datos inválidos' }).getStatus(), 400);
  assert.equal(mapper.toHttp({ code: 16, details: 'credenciales inválidas' }).getStatus(), 401);
  assert.equal(mapper.toHttp({ code: 6, details: 'duplicado' }).getStatus(), 409);
  assert.equal(mapper.toHttp({ code: 4 }).getStatus(), 504);
  assert.equal(mapper.toHttp({ code: 14 }).getStatus(), 503);
});
