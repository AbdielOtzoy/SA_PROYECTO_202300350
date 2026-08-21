import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/admin/auditoria/page.tsx', 'utf8');

test('auditoría usa tarjetas legibles para tendencias y periodos', () => {
  assert.match(page, /analytics-trend-grid/);
  assert.match(page, /analytics-trend-card/);
  assert.match(page, /period-form/);
  assert.match(page, /audit-period-row/);
  assert.match(page, /formatPeriodDate/);
  assert.match(page, /Nombre del periodo/);
  assert.match(page, /Inicio/);
  assert.match(page, /Fin/);
});
