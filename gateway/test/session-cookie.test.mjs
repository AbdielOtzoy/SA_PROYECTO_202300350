import test from 'node:test'; import assert from 'node:assert/strict'; import {readFileSync} from 'node:fs';
test('la cookie de sesión usa las banderas obligatorias',()=>assert.match(readFileSync('src/common/auth/session.service.ts','utf8'),/httpOnly: true,[\s\S]*secure: true,[\s\S]*sameSite: 'strict'/));
