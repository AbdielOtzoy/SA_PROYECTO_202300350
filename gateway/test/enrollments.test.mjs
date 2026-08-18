import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { EnrollmentsService } = require('../src/enrollments/enrollments.service.ts');

function sessionFor(role = 'student', userId = 'student-1') {
  return {
    requireStudentOrAdmin: () => ({
      token: `jwt-${role}`,
      claims: { sub: userId, roles: [role] },
    }),
  };
}

function requestWith(responses, calls) {
  return {
    unary: async (...args) => {
      calls.push(args);
      const [, method] = args;
      return responses[method];
    },
  };
}

test('estudiante consulta sus inscripciones con filtros y metadatos del catálogo', async () => {
  const calls = [];
  const service = new EnrollmentsService(
    requestWith(
      {
        ListEnrollments: {
          enrollments: [
            {
              course_id: 'course-1',
              semester_id: 'semester-1',
              status: 'active',
              credentials: 'regular',
            },
          ],
        },
        ListCourses: { courses: [{ id: 'course-1', code: 'SA', name: 'Software Avanzado', credits: 4 }] },
        ListSemesters: { semesters: [{ id: 'semester-1', year: 2026, term: 2 }] },
      },
      calls,
    ),
    sessionFor(),
  );

  const response = await service.list({}, { semester: 'semester-1', status: 'active', credentials: 'regular' });

  assert.deepEqual(response.enrollments[0], {
    user_id: 'student-1',
    course_id: 'course-1',
    course_code: 'SA',
    course_name: 'Software Avanzado',
    credits: 4,
    semester_id: 'semester-1',
    semester: '2026-2',
    semester_year: 2026,
    semester_term: 2,
    status: 'active',
    credentials: 'regular',
  });
  assert.deepEqual(calls[0], [
    'identity',
    'ListEnrollments',
    { user_id: 'student-1', semester: 'semester-1', status: 'active', credentials: 'regular' },
    'jwt-student',
  ]);
  assert.equal(calls[1][3], 'jwt-student');
  assert.equal(calls[2][3], 'jwt-student');
});

test('estudiante no puede consultar la inscripción de otra cuenta', async () => {
  const calls = [];
  const service = new EnrollmentsService(requestWith({}, calls), sessionFor());

  await assert.rejects(() => service.list({}, { user_id: 'student-2' }), /tus propias inscripciones/);
  assert.equal(calls.length, 0);
});

test('administrador puede consultar otra cuenta y conserva inscripciones sin metadatos', async () => {
  const calls = [];
  const service = new EnrollmentsService(
    requestWith(
      {
        ListEnrollments: {
          enrollments: [
            { course_id: 'missing-course', semester_id: 'missing-semester', status: 'pending', credentials: '' },
          ],
        },
        ListCourses: { courses: [] },
        ListSemesters: { semesters: [] },
      },
      calls,
    ),
    sessionFor('admin', 'admin-1'),
  );

  const response = await service.list({}, { user_id: 'student-2' });

  assert.equal(response.enrollments.length, 1);
  assert.equal(response.enrollments[0].user_id, 'student-2');
  assert.equal(response.enrollments[0].course_name, 'Curso no disponible');
  assert.equal(response.enrollments[0].semester, 'Semestre no disponible');
  assert.equal(calls[0][2].user_id, 'student-2');
  assert.equal(calls[0][3], 'jwt-admin');
});
