import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs';
test('la cookie de sesión usa las banderas obligatorias',()=>assert.match(readFileSync('src/main.ts','utf8'),/httpOnly:true,secure:true,sameSite:'strict'/));

