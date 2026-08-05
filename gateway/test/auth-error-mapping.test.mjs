import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gateway = readFileSync('src/main.ts', 'utf8');
const identity = readFileSync('../services/identity/src/main.ts', 'utf8');

test('traduce credenciales inválidas a 401 y datos inválidos a 400', () => {
  assert.match(identity, /GrpcStatus\.UNAUTHENTICATED/);
  assert.match(identity, /GrpcStatus\.INVALID_ARGUMENT/);
  assert.match(gateway, /case 16: throw new UnauthorizedException/);
  assert.match(gateway, /case 3: throw new BadRequestException/);
});

test('traduce correo duplicado a 409 sin propagar errores internos', () => {
  assert.match(identity, /GrpcStatus\.ALREADY_EXISTS/);
  assert.match(gateway, /case 6: throw new ConflictException/);
  assert.match(gateway, /default: throw new BadGatewayException/);
});
