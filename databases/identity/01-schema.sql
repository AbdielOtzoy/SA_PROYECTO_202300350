CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name varchar(150) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) UNIQUE NOT NULL,
  description text
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,
  description text
);

CREATE TABLE role_permissions (
  role_id uuid REFERENCES roles(id),
  permission_id uuid REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id uuid REFERENCES users(id),
  role_id uuid REFERENCES roles(id),
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_enrollments (
  user_id uuid REFERENCES users(id),
  course_id uuid NOT NULL,
  semester_id uuid NOT NULL,
  status varchar(20) NOT NULL,
  credentials varchar(50),
  PRIMARY KEY (user_id, course_id, semester_id)
);

CREATE TABLE credential_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  change_type varchar(20) NOT NULL,
  old_value_hash text,
  new_value_hash text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO credential_audit_log (
    user_id,
    change_type,
    old_value_hash,
    new_value_hash
  )
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP,
    NULL,
    NULL
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE TRIGGER user_roles_audit
AFTER INSERT OR DELETE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION audit_identity_change();

CREATE OR REPLACE PROCEDURE set_user_role(
  p_user uuid,
  p_role text,
  p_assign boolean,
  p_actor uuid
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_role uuid;
BEGIN
  SELECT id
  INTO v_role
  FROM roles
  WHERE name = p_role;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Rol inexistente';
  END IF;

  IF p_assign THEN
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (p_user, v_role, p_actor)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles
    WHERE user_id = p_user
      AND role_id = v_role;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION get_user_permissions(p_user uuid)
RETURNS TABLE(role_name varchar, permission_code varchar)
LANGUAGE sql
AS $$
  SELECT r.name, p.code
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user
$$;
