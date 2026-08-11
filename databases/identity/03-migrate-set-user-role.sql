-- Compatible con volúmenes antiguos (función) y nuevos (procedimiento).
DO $$
DECLARE
  v_kind "char";
BEGIN
  SELECT p.prokind
    INTO v_kind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'set_user_role'
     AND pg_get_function_identity_arguments(p.oid) = 'p_user uuid, p_role text, p_assign boolean, p_actor uuid';

  IF v_kind = 'f' THEN
    DROP FUNCTION set_user_role(uuid, text, boolean, uuid);
  ELSIF v_kind = 'p' THEN
    DROP PROCEDURE set_user_role(uuid, text, boolean, uuid);
  END IF;
END
$$;

CREATE OR REPLACE PROCEDURE set_user_role(p_user uuid, p_role text, p_assign boolean, p_actor uuid)
LANGUAGE plpgsql AS $$
DECLARE v_role uuid;
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
