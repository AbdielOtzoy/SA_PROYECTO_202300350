INSERT INTO permissions (id, code, description)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'catalog.read', 'Consultar catálogo'),
  ('00000000-0000-0000-0000-000000000102', 'playback.use', 'Reproducir contenido'),
  ('00000000-0000-0000-0000-000000000103', 'roles.manage', 'Gestionar roles'),
  ('00000000-0000-0000-0000-000000000104', 'catalog.manage', 'Gestionar catálogo');

INSERT INTO roles (id, name, description)
VALUES
  ('00000000-0000-0000-0000-000000000201', 'student', 'Estudiante'),
  ('00000000-0000-0000-0000-000000000202', 'teacher', 'Docente'),
  ('00000000-0000-0000-0000-000000000203', 'assistant', 'Auxiliar'),
  ('00000000-0000-0000-0000-000000000204', 'admin', 'Administrador');

INSERT INTO role_permissions
SELECT '00000000-0000-0000-0000-000000000201', id
FROM permissions
WHERE code IN ('catalog.read', 'playback.use');

INSERT INTO role_permissions
SELECT '00000000-0000-0000-0000-000000000204', id
FROM permissions;

INSERT INTO role_permissions
SELECT '00000000-0000-0000-0000-000000000202', id
FROM permissions
WHERE code IN ('catalog.read', 'playback.use', 'catalog.manage');

INSERT INTO users (id, email, password_hash, full_name)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@ingenieria.usac.edu.gt',
    '$2b$12$AkINGORtLljZNvqC5JWLKOpw33SeaOOKULvFTshGFLvlPCwkwUyL6',
    'Administración YoUSAC'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'estudiante@ing.usac.edu.gt',
    '$2b$12$AkINGORtLljZNvqC5JWLKOpw33SeaOOKULvFTshGFLvlPCwkwUyL6',
    'Estudiante Demo'
  );

INSERT INTO user_roles (user_id, role_id, assigned_by)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000001'
  );
