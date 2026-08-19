import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/recomendaciones/page.tsx', 'utf8');
const shell = readFileSync('components/AppShell.tsx', 'utf8');

test('la página de recomendaciones consulta el endpoint y contempla sus estados', () => {
  assert.match(page, /analytics\/recommendations/);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
  assert.match(page, /items\.length === 0/);
  assert.match(page, /recommendations-page-grid/);
  assert.match(page, /reproductor\//);
});

test('el menú lateral enlaza a recomendaciones', () => {
  assert.match(shell, /href: '\/recomendaciones'/);
  assert.match(shell, /Recomendado para ti/);
});
