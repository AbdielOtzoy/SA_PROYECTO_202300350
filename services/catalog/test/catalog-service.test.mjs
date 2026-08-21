import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CatalogService } = require('../src/catalog/catalog.service.ts');

test('rechaza docentes con correo no institucional', async () => {
  const service = new CatalogService({});
  await assert.rejects(
    () => service.upsertProfessor({ full_name: 'Prueba', email: 'prueba@gmail.com' }),
    /correo debe pertenecer/i,
  );
});

test('acepta docentes con correo institucional', async () => {
  const repository = {
    upsertProfessor: async (input) => ({ id: 'p-1', fullName: input.fullName, email: input.email }),
  };
  const service = new CatalogService(repository);
  const professor = await service.upsertProfessor({ full_name: 'Prueba', email: 'prueba@ingenieria.usac.edu.gt' });
  assert.equal(professor.email, 'prueba@ingenieria.usac.edu.gt');
});

const recordingHeader =
  'recording_id,title,course_code,semester_year,semester_term,lecture_date,unit,topic,video_path,is_published,professor_emails,assistant_emails';
const recordingRow =
  '00000000-0000-0000-0000-000000000999,Clase P5,SA,2026,2,2026-08-18,Unidad 1,gRPC,sample.mp4,true,docente@ingenieria.usac.edu.gt,auxiliar@ing.usac.edu.gt';

function recordingRepository(captured) {
  return {
    assertActorCanManageRecordingRows: async (rows) => captured.push(...rows),
    importRecordings: async () => [],
  };
}

test('mantiene compatible el CSV existente y crea campos P5 vacíos', async () => {
  const captured = [];
  const service = new CatalogService(recordingRepository(captured));
  const result = await service.importRecordings(Buffer.from(`${recordingHeader}\n${recordingRow}\n`), 'legacy.csv', {
    id: 'admin-1',
    email: 'admin@ing.usac.edu.gt',
    roles: ['admin'],
  });
  assert.equal(result.accepted, true);
  assert.equal(captured[0].topics, '');
  assert.deepEqual(captured[0].attachments_json, []);
});

test('valida e importa temas múltiples y adjuntos de ficha', async () => {
  const captured = [];
  const repository = recordingRepository(captured);
  const service = new CatalogService(repository);
  const attachments = JSON.stringify([
    {
      filename: 'silabo.pdf',
      file_path: 'https://example.test/silabo.pdf',
      file_type: 'application/pdf',
      attachment_type: 'syllabus',
    },
    {
      filename: 'guia.pdf',
      file_path: '/materiales/guia.pdf',
      file_type: 'application/pdf',
      attachment_type: 'material',
    },
  ]).replaceAll('"', '""');
  const header = `${recordingHeader},topics,attachments_json`;
  const row = `${recordingRow},"gRPC; Microservicios; grpc","${attachments}"`;
  await service.importRecordings(Buffer.from(`${header}\n${row}\n`), 'p5.csv', {
    id: 'admin-1',
    email: 'admin@ing.usac.edu.gt',
    roles: ['admin'],
  });
  assert.equal(captured[0].topics, 'gRPC;Microservicios');
  assert.equal(captured[0].attachments_json.length, 2);
  assert.equal(captured[0].attachments_json[0].attachment_type, 'syllabus');
});

test('rechaza adjuntos con rutas no permitidas', async () => {
  const service = new CatalogService(recordingRepository([]));
  const header = `${recordingHeader},attachments_json`;
  const row = `${recordingRow},"[{""filename"":""x.pdf"",""file_path"":""ftp://example.test/x.pdf""}]"`;
  await assert.rejects(
    () =>
      service.importRecordings(Buffer.from(`${header}\n${row}\n`), 'p5.csv', {
        id: 'admin-1',
        email: 'admin@ing.usac.edu.gt',
        roles: ['admin'],
      }),
    /ruta inválida/i,
  );
});
