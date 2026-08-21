import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CatalogService } = require('../src/catalog/catalog.service.ts');

function session() {
  return {
    require: () => ({ token: 'jwt-student', claims: { sub: 'student-1', roles: ['student'] } }),
  };
}

test('adapta la ficha gRPC con temas, participantes y adjuntos', async () => {
  const service = new CatalogService(
    {
      unary: async () => ({
        recording: {
          id: 'recording-1',
          title: 'Clase P5',
          course: 'Software Avanzado',
          course_code: 'SA',
          semester: '2026-2',
          lecture_date: '2026-08-18',
          unit: 'Unidad 1',
          topic: 'gRPC',
          topics: ['gRPC', 'Microservicios'],
          recommendation: 90,
          professors: [{ id: 'p-1', full_name: 'Docente', email: 'docente@ing.usac.edu.gt' }],
          assistants: [{ id: 'p-2', full_name: 'Auxiliar', email: 'auxiliar@ing.usac.edu.gt' }],
          attachments: [
            {
              id: 'a-1',
              filename: 'silabo.pdf',
              file_path: 'https://example.test/silabo.pdf',
              file_type: 'application/pdf',
              attachment_type: 'syllabus',
            },
          ],
        },
      }),
    },
    session(),
  );

  const response = await service.detail({}, 'recording-1');
  assert.deepEqual(response.recording.topics, ['gRPC', 'Microservicios']);
  assert.equal(response.recording.professors[0].full_name, 'Docente');
  assert.equal(response.recording.assistants[0].full_name, 'Auxiliar');
  assert.equal(response.recording.attachments[0].attachment_type, 'syllabus');
});

test('propaga el filtro topic y expone las etiquetas en las opciones', async () => {
  const calls = [];
  const service = new CatalogService(
    {
      unary: async (...args) => {
        calls.push(args);
        const method = args[1];
        if (method === 'GetCatalogPage') {
          return { recordings: [{ recording_id: 'r-1', title: 'Clase', topic: 'gRPC', topics: ['gRPC'] }] };
        }
        if (method === 'ListTopics') return { topics: [{ id: 't-1', name: 'gRPC' }] };
        return { [method.replace('List', '').toLowerCase()]: [] };
      },
    },
    session(),
  );

  await service.list({}, { topic: 'gRPC' });
  assert.equal(calls[0][2].topic, 'gRPC');
  const options = await service.options({});
  assert.deepEqual(options.topics.topics, [{ id: 't-1', name: 'gRPC' }]);
});
