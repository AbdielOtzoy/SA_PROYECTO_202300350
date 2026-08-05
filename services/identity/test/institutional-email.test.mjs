import test from 'node:test'; import assert from 'node:assert/strict';
const valid=email=>/^[^\s@]+@[^\s@]+$/.test(email)&&['usac.edu.gt','correo.usac.edu.gt'].includes(email.split('@')[1]);
test('acepta dominios institucionales',()=>assert.equal(valid('persona@usac.edu.gt'),true));
test('rechaza dominios externos',()=>assert.equal(valid('persona@example.com'),false));

