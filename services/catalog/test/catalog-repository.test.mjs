import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CatalogRepository } = require('../src/catalog/catalog.repository.ts');

test('el repositorio mapea la recomendación a número', async () => {
  const pool = {
    query: async () => ({
      rows: [
        {
          id: 'r-1',
          title: 'Álgebra',
          course: 'MAT',
          course_code: 'MAT1',
          school: 'FIUSAC',
          semester: '1S',
          unit: '1',
          topic: 'Vectores',
          video_path: '/videos/a.mp4',
          recommendation: '87.5',
        },
      ],
    }),
  };
  const repository = new CatalogRepository(pool);
  const reply = await repository.list({ query: '', school: '', course: '', semester: '' });
  assert.equal(reply.recordings[0].recommendation, 87.5);
  assert.equal(reply.pageSize, 10);
});

test('calcula la página y limita el tamaño a diez registros', async () => {
  let call;
  const pool = {
    query: async (_sql, values) => {
      call = values;
      return { rows: [] };
    },
  };
  const repository = new CatalogRepository(pool);
  const reply = await repository.list({ page: 3, page_size: 50, professor: 'Docente' });
  assert.deepEqual(call.slice(-2), [10, 20]);
  assert.equal(reply.totalPages, 0);
});

test('conserva todos los filtros al calcular el desplazamiento', async () => {
  let call;
  const pool = {
    query: async (_sql, values) => {
      call = values;
      return { rows: [] };
    },
  };
  const repository = new CatalogRepository(pool);
  await repository.list({
    query: 'CSV',
    school: 'FIUSAC',
    course: 'SA',
    semester: '2026-2',
    professor: 'Docente',
    page: 2,
    page_size: 3,
  });
  assert.deepEqual(call.slice(0, 5), ['CSV', 'FIUSAC', 'SA', '2026-2', 'Docente']);
  assert.deepEqual(call.slice(-2), [3, 3]);
});

test('envía el filtro de tema como criterio independiente', async () => {
  let call;
  const pool = {
    query: async (_sql, values) => {
      call = values;
      return { rows: [] };
    },
  };
  const repository = new CatalogRepository(pool);
  await repository.list({ topic: 'gRPC', page: 1, page_size: 10 });
  assert.equal(call[5], 'gRPC');
  assert.equal(call[6], '');
});

test('arma la ficha con docentes, auxiliares y materiales separados', async () => {
  const pool = {
    query: async (sql) => {
      if (sql.includes('recording_detail')) {
        return {
          rows: [
            {
              id: 'r-1',
              title: 'Clase',
              course: 'Software Avanzado',
              course_code: 'SA',
              school: 'FIUSAC',
              semester: '2026-2',
              unit: 'Unidad 1',
              topic: 'gRPC',
              topics: ['gRPC', 'Microservicios'],
              video_path: 'sample.mp4',
              lecture_date: '2026-08-18',
              recommendation: 80,
            },
          ],
        };
      }
      if (sql.includes('recording_professors')) {
        return {
          rows: [
            { id: 'p-1', full_name: 'Docente', email: 'docente@ing.usac.edu.gt', role_type: 'professor' },
            { id: 'p-2', full_name: 'Auxiliar', email: 'auxiliar@ing.usac.edu.gt', role_type: 'assistant' },
          ],
        };
      }
      return {
        rows: [
          {
            id: 'a-1',
            filename: 'silabo.pdf',
            file_path: 'https://example.test/silabo.pdf',
            file_type: 'application/pdf',
            attachment_type: 'syllabus',
          },
        ],
      };
    },
  };
  const repository = new CatalogRepository(pool);
  const detail = await repository.find({ id: 'r-1' });
  assert.equal(detail.professors[0].fullName, 'Docente');
  assert.equal(detail.assistants[0].fullName, 'Auxiliar');
  assert.deepEqual(detail.topics, ['gRPC', 'Microservicios']);
  assert.equal(detail.attachments[0].attachmentType, 'syllabus');
});
