-- Práctica 3: importación transaccional de inscripciones.

-- Migración compatible con volúmenes de la práctica 2 que aún conservan la
-- clave primaria anterior (user_id, course_id).
ALTER TABLE user_enrollments
  ALTER COLUMN semester_id SET NOT NULL;

ALTER TABLE user_enrollments
  DROP CONSTRAINT IF EXISTS user_enrollments_pkey;

ALTER TABLE user_enrollments
  ADD CONSTRAINT user_enrollments_pkey PRIMARY KEY (user_id, course_id, semester_id);

CREATE OR REPLACE PROCEDURE sp_import_enrollments_csv(p_rows jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_user uuid;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'El CSV de inscripciones no contiene filas';
  END IF;

  FOR v_row IN
    SELECT *
    FROM jsonb_to_recordset(p_rows) AS x(
      user_email text,
      course_id uuid,
      semester_id uuid,
      status text,
      credentials text
    )
  LOOP
    SELECT id INTO v_user
    FROM users
    WHERE lower(email) = lower(trim(v_row.user_email)) AND is_active;

    IF v_user IS NULL
       OR v_row.course_id IS NULL
       OR v_row.semester_id IS NULL
       OR nullif(trim(v_row.status), '') IS NULL THEN
      RAISE EXCEPTION 'Fila de inscripción inválida para: %', v_row.user_email;
    END IF;

    INSERT INTO user_enrollments (user_id, course_id, semester_id, status, credentials)
    VALUES (
      v_user,
      v_row.course_id,
      v_row.semester_id,
      trim(v_row.status),
      NULLIF(trim(v_row.credentials), '')
    )
    ON CONFLICT (user_id, course_id, semester_id) DO UPDATE SET status = EXCLUDED.status,
                  credentials = EXCLUDED.credentials;
  END LOOP;
END
$$;
