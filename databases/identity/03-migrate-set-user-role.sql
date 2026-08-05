-- Aplicar una vez en volúmenes creados antes de que set_user_role fuera un PROCEDURE.
-- Las instalaciones nuevas ya reciben el procedimiento desde 01-schema.sql.
DROP FUNCTION IF EXISTS set_user_role(uuid, text, boolean, uuid);
CREATE OR REPLACE PROCEDURE set_user_role(p_user uuid, p_role text, p_assign boolean, p_actor uuid)
LANGUAGE plpgsql AS $$
DECLARE v_role uuid;
BEGIN
  SELECT id INTO v_role FROM roles WHERE name=p_role;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Rol inexistente'; END IF;
  IF p_assign THEN
    INSERT INTO user_roles(user_id, role_id, assigned_by) VALUES(p_user,v_role,p_actor) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles WHERE user_id=p_user AND role_id=v_role;
  END IF;
END $$;
