-- Práctica 3: operaciones transaccionales del catálogo.
-- El backend envía el CSV validado como un arreglo JSONB y estos
-- procedimientos realizan las escrituras dentro de una sola operación.

-- También puede ejecutarse manualmente sobre un volumen creado en P2.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE professors ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE professors DROP CONSTRAINT IF EXISTS professors_institutional_email;
ALTER TABLE professors ADD CONSTRAINT professors_institutional_email CHECK (
  email ~* '^[^\s@]+@(ingenieria\.usac\.edu\.gt|ing\.usac\.edu\.gt)$'
) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS semesters_year_term_unique ON semesters(year, term);

CREATE TABLE IF NOT EXISTS course_staff (
  course_id uuid NOT NULL REFERENCES courses(id),
  professor_id uuid NOT NULL REFERENCES professors(id),
  role_type varchar(20) NOT NULL CHECK (role_type IN ('professor', 'assistant')),
  assigned_by_email varchar(255),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, professor_id)
);

CREATE TABLE IF NOT EXISTS recording_professors (
  recording_id uuid NOT NULL REFERENCES recordings(id),
  professor_id uuid NOT NULL REFERENCES professors(id),
  role_type varchar(20) NOT NULL CHECK (role_type IN ('professor', 'assistant')),
  PRIMARY KEY (recording_id, professor_id)
);

DROP VIEW IF EXISTS recording_detail;
DROP VIEW IF EXISTS published_catalog;

CREATE VIEW published_catalog AS
SELECT
  r.id,
  r.course_id,
  r.title,
  c.code course_code,
  c.name course,
  s.name school,
  (se.year::text || '-' || se.term::text) semester,
  r.lecture_date,
  r.unit,
  r.topic,
  r.video_path,
  COALESCE(
    string_agg(DISTINCT p.full_name, ', ' ORDER BY p.full_name)
      FILTER (WHERE p.full_name IS NOT NULL),
    ''
  ) professor,
  recommendation_percentage(r.id) recommendation
FROM recordings r
JOIN courses c ON c.id = r.course_id
JOIN schools s ON s.id = c.school_id
JOIN semesters se ON se.id = r.semester_id
LEFT JOIN recording_professors rp ON rp.recording_id = r.id
LEFT JOIN professors p ON p.id = rp.professor_id
WHERE r.is_published
  AND r.is_active
  AND c.is_active
  AND s.is_active
  AND se.is_active
GROUP BY r.id, r.course_id, r.title, c.code, c.name, s.name, se.year, se.term,
         r.lecture_date, r.unit, r.topic, r.video_path;

CREATE VIEW recording_detail AS SELECT * FROM published_catalog;

CREATE OR REPLACE PROCEDURE sp_assign_course_staff(
  p_course uuid,
  p_professor uuid,
  p_role text,
  p_actor_email text
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_role NOT IN ('professor', 'assistant') THEN
    RAISE EXCEPTION 'Tipo de asignación inválido: %', p_role;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course AND is_active) THEN
    RAISE EXCEPTION 'Curso inexistente o archivado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM professors WHERE id = p_professor AND is_active) THEN
    RAISE EXCEPTION 'Docente inexistente o archivado';
  END IF;

  INSERT INTO course_staff (course_id, professor_id, role_type, assigned_by_email)
  VALUES (p_course, p_professor, p_role, NULLIF(trim(p_actor_email), ''))
  ON CONFLICT (course_id, professor_id)
  DO UPDATE SET role_type = EXCLUDED.role_type,
                assigned_by_email = EXCLUDED.assigned_by_email,
                assigned_at = now();
END
$$;

CREATE OR REPLACE PROCEDURE sp_revoke_course_staff(
  p_course uuid,
  p_professor uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM course_staff
  WHERE course_id = p_course
    AND professor_id = p_professor;
END
$$;

CREATE OR REPLACE PROCEDURE sp_import_catalog_csv(p_rows jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_school uuid;
  v_semester uuid;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'El CSV de catálogo no contiene filas';
  END IF;

  FOR v_row IN
    SELECT *
    FROM jsonb_to_recordset(p_rows) AS x(
      school_code text,
      school_name text,
      course_code text,
      course_name text,
      credits integer,
      semester_year integer,
      semester_term integer
    )
  LOOP
    IF nullif(trim(v_row.school_code), '') IS NULL
       OR nullif(trim(v_row.school_name), '') IS NULL
       OR nullif(trim(v_row.course_code), '') IS NULL
       OR nullif(trim(v_row.course_name), '') IS NULL
       OR v_row.credits IS NULL
       OR v_row.credits <= 0
       OR v_row.semester_year IS NULL
       OR v_row.semester_term NOT IN (1, 2) THEN
      RAISE EXCEPTION 'Fila de catálogo incompleta';
    END IF;

    INSERT INTO schools (code, name)
    VALUES (trim(v_row.school_code), trim(v_row.school_name))
    ON CONFLICT (code)
    DO UPDATE SET name = EXCLUDED.name, is_active = true
    RETURNING id INTO v_school;

    INSERT INTO semesters (year, term)
    VALUES (v_row.semester_year, v_row.semester_term)
    ON CONFLICT (year, term)
    DO UPDATE SET is_active = true
    RETURNING id INTO v_semester;

    INSERT INTO courses (code, name, school_id, credits)
    VALUES (trim(v_row.course_code), trim(v_row.course_name), v_school, v_row.credits)
    ON CONFLICT (code)
    DO UPDATE SET name = EXCLUDED.name,
                  school_id = EXCLUDED.school_id,
                  credits = EXCLUDED.credits,
                  is_active = true;
  END LOOP;
END
$$;

CREATE OR REPLACE PROCEDURE sp_import_recordings_csv(p_rows jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_course uuid;
  v_semester uuid;
  v_email text;
  v_professor uuid;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'El CSV de grabaciones no contiene filas';
  END IF;

  FOR v_row IN
    SELECT *
    FROM jsonb_to_recordset(p_rows) AS x(
      recording_id uuid,
      title text,
      course_code text,
      semester_year integer,
      semester_term integer,
      lecture_date date,
      unit text,
      topic text,
      video_path text,
      is_published boolean,
      professor_emails text,
      assistant_emails text
    )
  LOOP
    SELECT id INTO v_course
    FROM courses
    WHERE code = trim(v_row.course_code) AND is_active;

    SELECT id INTO v_semester
    FROM semesters
    WHERE year = v_row.semester_year AND term = v_row.semester_term AND is_active;

    IF v_row.recording_id IS NULL
       OR nullif(trim(v_row.title), '') IS NULL
       OR v_course IS NULL
       OR v_semester IS NULL
       OR v_row.lecture_date IS NULL
       OR nullif(trim(v_row.video_path), '') IS NULL THEN
      RAISE EXCEPTION 'Fila de grabación inválida: %', v_row.title;
    END IF;

    INSERT INTO recordings (
      id, title, course_id, semester_id, lecture_date, unit, topic,
      video_path, is_published, is_active
    )
    VALUES (
      v_row.recording_id, trim(v_row.title), v_course, v_semester,
      v_row.lecture_date, NULLIF(trim(v_row.unit), ''), NULLIF(trim(v_row.topic), ''),
      trim(v_row.video_path), COALESCE(v_row.is_published, false), true
    )
    ON CONFLICT (id)
    DO UPDATE SET title = EXCLUDED.title,
                  course_id = EXCLUDED.course_id,
                  semester_id = EXCLUDED.semester_id,
                  lecture_date = EXCLUDED.lecture_date,
                  unit = EXCLUDED.unit,
                  topic = EXCLUDED.topic,
                  video_path = EXCLUDED.video_path,
                  is_published = EXCLUDED.is_published,
                  is_active = true;

    DELETE FROM recording_professors WHERE recording_id = v_row.recording_id;

    FOREACH v_email IN ARRAY string_to_array(COALESCE(v_row.professor_emails, ''), ';')
    LOOP
      IF nullif(trim(v_email), '') IS NULL THEN CONTINUE; END IF;
      SELECT id INTO v_professor FROM professors WHERE lower(email) = lower(trim(v_email)) AND is_active;
      IF v_professor IS NULL THEN
        RAISE EXCEPTION 'Docente inexistente en grabación: %', trim(v_email);
      END IF;
      INSERT INTO recording_professors (recording_id, professor_id, role_type)
      VALUES (v_row.recording_id, v_professor, 'professor');
    END LOOP;

    FOREACH v_email IN ARRAY string_to_array(COALESCE(v_row.assistant_emails, ''), ';')
    LOOP
      IF nullif(trim(v_email), '') IS NULL THEN CONTINUE; END IF;
      SELECT id INTO v_professor FROM professors WHERE lower(email) = lower(trim(v_email)) AND is_active;
      IF v_professor IS NULL THEN
        RAISE EXCEPTION 'Auxiliar inexistente en grabación: %', trim(v_email);
      END IF;
      INSERT INTO recording_professors (recording_id, professor_id, role_type)
      VALUES (v_row.recording_id, v_professor, 'assistant');
    END LOOP;
  END LOOP;
END
$$;
