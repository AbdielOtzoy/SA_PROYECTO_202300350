-- Datos demo idempotentes para demostrar RBAC y alcance por curso.
INSERT INTO professors (id, full_name, email)
VALUES
  ('00000000-0000-0000-0000-000000000401', 'Docente Demo', 'docente@ingenieria.usac.edu.gt'),
  ('00000000-0000-0000-0000-000000000402', 'Auxiliar Demo', 'auxiliar@ing.usac.edu.gt')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, is_active = true;

INSERT INTO course_staff (course_id, professor_id, role_type, assigned_by_email)
VALUES
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000401', 'professor', 'admin@ingenieria.usac.edu.gt'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000402', 'assistant', 'admin@ingenieria.usac.edu.gt')
ON CONFLICT (course_id, professor_id)
DO UPDATE SET role_type = EXCLUDED.role_type, assigned_by_email = EXCLUDED.assigned_by_email;

INSERT INTO recording_professors (recording_id, professor_id, role_type)
SELECT r.id, '00000000-0000-0000-0000-000000000401', 'professor'
FROM recordings r
ON CONFLICT (recording_id, professor_id) DO NOTHING;
