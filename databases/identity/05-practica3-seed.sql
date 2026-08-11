-- Usuarios demo idempotentes para demostrar los tres roles autorizados.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('catalog.read', 'playback.use', 'catalog.manage')
WHERE r.name IN ('teacher', 'assistant')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'docente@ingenieria.usac.edu.gt', '$2b$12$82ybdPSYbAtXYTkZQZXxg.MpFDJb1R9wwce8eLPXNCV2j9Ws4sGM2', 'Docente Demo'),
  ('00000000-0000-0000-0000-000000000004', 'auxiliar@ing.usac.edu.gt', '$2b$12$82ybdPSYbAtXYTkZQZXxg.MpFDJb1R9wwce8eLPXNCV2j9Ws4sGM2', 'Auxiliar Demo')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email,
                               password_hash = EXCLUDED.password_hash,
                               full_name = EXCLUDED.full_name,
                               is_active = true;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT '00000000-0000-0000-0000-000000000003', id, '00000000-0000-0000-0000-000000000001'
FROM roles WHERE name = 'teacher'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT '00000000-0000-0000-0000-000000000004', id, '00000000-0000-0000-0000-000000000001'
FROM roles WHERE name = 'assistant'
ON CONFLICT DO NOTHING;
