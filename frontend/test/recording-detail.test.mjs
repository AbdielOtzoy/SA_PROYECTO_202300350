import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('la ficha muestra metadatos académicos, participantes y materiales', () => {
  const page = readFileSync('app/reproductor/[id]/page.tsx', 'utf8');
  assert.match(page, /FECHA DE IMPARTICIÓN/);
  assert.match(page, /DOCENTES/);
  assert.match(page, /AUXILIARES/);
  assert.match(page, /Sílabo y materiales/);
  assert.match(page, /Esta grabación no tiene materiales adjuntos/);
  assert.match(page, /target="_blank"/);
});

test('el catálogo expone el filtro y las etiquetas de temas', () => {
  const page = readFileSync('app/catalogo/page.tsx', 'utf8');
  assert.match(page, /Todos los temas/);
  assert.match(page, /options\?\.topics\.topics/);
  assert.match(page, /setTopic/);
  assert.match(page, /recording\.topics/);
});
