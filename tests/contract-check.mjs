import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
for (const file of ['proto/identity.proto','proto/catalog.proto','proto/playback.proto','proto/analytics.proto','proto/notifications.proto','docker-compose.local.yml','videos/sample.mp4']) assert.ok(existsSync(file),`Falta ${file}`);
const compose=readFileSync('docker-compose.local.yml','utf8');
for(const service of ['identity:','catalog:','playback:','analytics:','notifications:','gateway:','frontend:']) assert.match(compose,new RegExp('\\n  '+service));
const gateway=readFileSync('gateway/src/main.ts','utf8');
assert.match(gateway,/httpOnly:true,secure:true,sameSite:'strict'/);
assert.match(gateway,/clients\.playback\.StreamVideo/);
console.log('Contratos, topología y cookie segura verificados.');

