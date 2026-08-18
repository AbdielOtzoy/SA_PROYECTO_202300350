import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

const requiredFiles = [
  'proto/identity.proto',
  'proto/catalog.proto',
  'proto/playback.proto',
  'proto/analytics.proto',
  'proto/notifications.proto',
  'docker-compose.local.yml',
  'tests/fixtures/csv/recordings-samples.csv',
  ...['sample.mp4', ...Array.from({ length: 11 }, (_, index) => `sample${index + 2}.mp4`)].map(
    (file) => `videos/${file}`,
  ),
];

for (const file of requiredFiles) {
  assert.ok(existsSync(file), `Falta ${file}`);
}

for (const fixture of [
  'tests/fixtures/csv/recordings.csv',
  'tests/fixtures/csv/recordings-extra.csv',
  'tests/fixtures/csv/recordings-samples.csv',
  'tests/fixtures/csv/recordings-p5.csv',
]) {
  const [header, ...rows] = readFileSync(fixture, 'utf8').trim().split(/\r?\n/);
  const videoColumn = header.split(',').indexOf('video_path');
  assert.ok(videoColumn >= 0, `Falta video_path en ${fixture}`);
  for (const row of rows) {
    const videoFile = basename(row.split(',')[videoColumn] || '');
    assert.ok(existsSync(`videos/${videoFile}`), `Falta videos/${videoFile} usado por ${fixture}`);
  }
}

const compose = readFileSync('docker-compose.local.yml', 'utf8');
const services = ['identity:', 'catalog:', 'playback:', 'analytics:', 'notifications:', 'gateway:', 'frontend:'];
for (const service of services) {
  assert.match(compose, new RegExp('\\n  ' + service));
}

const gateway = readFileSync('gateway/src/auth/auth.controller.ts', 'utf8');
const gatewayAuth = readFileSync('gateway/src/common/auth/session.service.ts', 'utf8');
const gatewayGrpc = readFileSync('gateway/src/common/grpc/grpc.client.ts', 'utf8');
const gatewayStream = readFileSync('gateway/src/playback/playback.controller.ts', 'utf8');
assert.match(gatewayAuth, /httpOnly: true/);
assert.match(gatewayStream, /this\.grpc\.stream/);
const grpcAddresses = [
  'IDENTITY_GRPC_ADDRESS',
  'CATALOG_GRPC_ADDRESS',
  'PLAYBACK_GRPC_ADDRESS',
  'ANALYTICS_GRPC_ADDRESS',
  'NOTIFICATIONS_GRPC_ADDRESS',
];
for (const name of grpcAddresses) {
  assert.match(gatewayGrpc, new RegExp(name));
}

assert.match(readFileSync('gateway/src/common/config/app-config.ts', 'utf8'), /GRPC_TIMEOUT_MS/);
assert.match(gatewayGrpc, /deadline: new Date/);
assert.match(gatewayGrpc, /grpcTimeoutMs/);

const errors = readFileSync('gateway/src/common/grpc/grpc-error.ts', 'utf8');
for (const grpcCode of [400, 401, 409, 403, 404, 504, 503, 502]) {
  assert.match(errors, new RegExp(`GrpcHttpException\\(code, ${grpcCode}`));
}

assert.match(gatewayStream, /StreamVideo/);
const identity = readFileSync('services/identity/src/identity/identity.service.ts', 'utf8');
assert.match(identity, /GrpcStatus\.INVALID_ARGUMENT/);
assert.match(identity, /GrpcStatus\.UNAUTHENTICATED/);
assert.match(identity, /GrpcStatus\.ALREADY_EXISTS/);
assert.match(readFileSync('services/identity/src/common/config/app-config.ts', 'utf8'), /JWT_EXPIRES_IN \|\| '60m'/);
assert.ok(existsSync('services/playback/gen/catalog.pb.go'), 'Falta el contrato Go generado de catálogo');
assert.ok(existsSync('services/playback/gen/playback.pb.go'), 'Falta el contrato Go generado de reproducción');
const playback = readFileSync('services/playback/cmd/playback/main.go', 'utf8');
assert.match(playback, /CATALOG_GRPC_ADDRESS/);
assert.match(playback, /PLAYBACK_GRPC_BIND/);
assert.match(compose, /mongosh --quiet/);
assert.match(compose, /redis-cli/);
assert.ok(existsSync('services/analytics/app/analytics/service.py'), 'Falta el servicio de dominio de Analítica');
assert.ok(existsSync('services/analytics/app/analytics/repository.py'), 'Falta el repositorio de Analítica');
assert.ok(existsSync('services/analytics/app/transport/grpc_adapter.py'), 'Falta el adaptador gRPC de Analítica');
assert.match(readFileSync('services/analytics/Dockerfile', 'utf8'), /"python","-m","app\.main"/);
console.log('Contratos, topología y cookie segura verificados.');
