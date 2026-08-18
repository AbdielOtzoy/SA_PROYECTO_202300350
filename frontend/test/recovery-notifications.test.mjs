import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('login y recuperación exponen el flujo de enlace temporal', () => {
  const login = readFileSync('app/page.tsx', 'utf8');
  const recovery = readFileSync('app/recuperar/page.tsx', 'utf8');
  assert.match(login, /href="\/recuperar"/);
  assert.match(recovery, /\/auth\/recovery\/request/);
  assert.match(recovery, /\/auth\/recovery\/reset/);
  assert.match(recovery, /token/);
});

test('configuración muestra preferencias editables y obligatorias', () => {
  const settings = readFileSync('app/configuracion/page.tsx', 'utf8');
  assert.match(settings, /new_recording/);
  assert.match(settings, /admin_notice/);
  assert.match(settings, /Recuperación de acceso/);
  assert.match(settings, /Seguridad de cuenta/);
});

test('el panel administrativo permite avisos por rol o curso', () => {
  const page = readFileSync('app/admin/notificaciones/page.tsx', 'utf8');
  assert.match(page, /target_type/);
  assert.match(page, /target_value/);
  assert.match(page, /\/admin\/notifications/);
});
