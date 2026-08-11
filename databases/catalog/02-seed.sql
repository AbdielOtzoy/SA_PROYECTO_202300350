INSERT INTO schools (id, name, code)
VALUES ('00000000-0000-0000-0000-000000000301', 'Facultad de Ingeniería', 'FIUSAC');

INSERT INTO courses (id, code, name, school_id, credits)
VALUES (
  '00000000-0000-0000-0000-000000000302',
  'SA',
  'Software Avanzado',
  '00000000-0000-0000-0000-000000000301',
  4
);

INSERT INTO semesters (id, year, term)
VALUES ('00000000-0000-0000-0000-000000000303', 2026, 2);

INSERT INTO recordings (
  id,
  title,
  course_id,
  semester_id,
  lecture_date,
  unit,
  topic,
  video_path,
  is_published
)
VALUES (
  '00000000-0000-0000-0000-000000000304',
  'Microservicios y contratos gRPC',
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000303',
  '2026-07-01',
  'Unidad 1',
  'Arquitectura',
  'sample.mp4',
  true
);

INSERT INTO recordings (
  id,
  title,
  course_id,
  semester_id,
  lecture_date,
  unit,
  topic,
  video_path,
  is_published
)
VALUES
  (
    '00000000-0000-0000-0000-000000000305',
    'Video de ejemplo 2',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303',
    '2026-07-08',
    'Unidad 1',
    'Introducción',
    'sample2.mp4',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000306',
    'Video de ejemplo 3',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303',
    '2026-07-15',
    'Unidad 2',
    'Persistencia',
    'sample3.mp4',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000307',
    'Video de ejemplo 4',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303',
    '2026-07-22',
    'Unidad 2',
    'Servicios distribuidos',
    'sample4.mp4',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000308',
    'Video de ejemplo 5',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303',
    '2026-07-29',
    'Unidad 3',
    'Integración',
    'sample5.mp4',
    true
  );

INSERT INTO ratings (user_id, recording_id, vote)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000304',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000304',
    true
  );

INSERT INTO professors (id, full_name, email)
VALUES
  (
    '00000000-0000-0000-0000-000000000401',
    'Docente Demo',
    'docente@ingenieria.usac.edu.gt'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    'Auxiliar Demo',
    'auxiliar@ing.usac.edu.gt'
  );

INSERT INTO course_staff (course_id, professor_id, role_type, assigned_by_email)
VALUES
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000401',
    'professor',
    'admin@ingenieria.usac.edu.gt'
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000402',
    'assistant',
    'admin@ingenieria.usac.edu.gt'
  );

INSERT INTO recording_professors (recording_id, professor_id, role_type)
SELECT id, '00000000-0000-0000-0000-000000000401', 'professor'
FROM recordings;
