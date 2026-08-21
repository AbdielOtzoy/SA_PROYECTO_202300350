-- P5: temas normalizados, materiales y ficha detallada de grabaciones.
-- Esta migración es idempotente y también puede aplicarse sobre un volumen
-- creado antes de P5.

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS topics_name_lower_unique ON topics (lower(name));

CREATE TABLE IF NOT EXISTS recording_topics (
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (recording_id, topic_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  file_path text NOT NULL,
  file_type varchar(100) NOT NULL DEFAULT 'application/octet-stream',
  attachment_type varchar(20) NOT NULL DEFAULT 'material'
    CHECK (attachment_type IN ('syllabus', 'material')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recording_topics_topic_idx ON recording_topics(topic_id, recording_id);
CREATE INDEX IF NOT EXISTS attachments_recording_idx ON attachments(recording_id, attachment_type, filename);

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
    array_agg(DISTINCT t.name ORDER BY t.name)
      FILTER (WHERE t.name IS NOT NULL),
    ARRAY[]::varchar[]
  ) topics,
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
LEFT JOIN recording_topics rt ON rt.recording_id = r.id
LEFT JOIN topics t ON t.id = rt.topic_id
WHERE r.is_published
  AND r.is_active
  AND c.is_active
  AND s.is_active
  AND se.is_active
GROUP BY r.id, r.course_id, r.title, c.code, c.name, s.name, se.year, se.term,
         r.lecture_date, r.unit, r.topic, r.video_path;

CREATE VIEW recording_detail AS SELECT * FROM published_catalog;

CREATE OR REPLACE PROCEDURE sp_import_recordings_csv(p_rows jsonb)
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_course uuid;
  v_semester uuid;
  v_email text;
  v_professor uuid;
  v_topic text;
  v_topic_id uuid;
  v_attachment jsonb;
  v_attachment_type text;
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
      topics text,
      video_path text,
      is_published boolean,
      professor_emails text,
      assistant_emails text,
      attachments_json jsonb
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
      v_row.lecture_date, NULLIF(trim(v_row.unit), ''),
      COALESCE(NULLIF(trim(v_row.topic), ''), NULLIF(trim(split_part(v_row.topics, ';', 1)), '')),
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
    DELETE FROM recording_topics WHERE recording_id = v_row.recording_id;
    DELETE FROM attachments WHERE recording_id = v_row.recording_id;

    FOR v_topic IN
      SELECT DISTINCT trim(value)
      FROM regexp_split_to_table(
        COALESCE(NULLIF(trim(v_row.topics), ''), NULLIF(trim(v_row.topic), '')),
        ';'
      ) AS value
      WHERE nullif(trim(value), '') IS NOT NULL
    LOOP
      INSERT INTO topics(name)
      VALUES (v_topic)
      ON CONFLICT DO NOTHING;

      SELECT id INTO v_topic_id
      FROM topics
      WHERE lower(name) = lower(v_topic)
      LIMIT 1;

      INSERT INTO recording_topics(recording_id, topic_id)
      VALUES (v_row.recording_id, v_topic_id)
      ON CONFLICT DO NOTHING;
    END LOOP;

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

    IF v_row.attachments_json IS NOT NULL THEN
      IF jsonb_typeof(v_row.attachments_json) <> 'array' THEN
        RAISE EXCEPTION 'Los adjuntos deben ser un arreglo JSON';
      END IF;

      FOR v_attachment IN SELECT value FROM jsonb_array_elements(v_row.attachments_json)
      LOOP
        v_attachment_type := COALESCE(NULLIF(trim(v_attachment->>'attachment_type'), ''), 'material');
        IF nullif(trim(v_attachment->>'filename'), '') IS NULL
           OR nullif(trim(v_attachment->>'file_path'), '') IS NULL
           OR v_attachment_type NOT IN ('syllabus', 'material') THEN
          RAISE EXCEPTION 'Adjunto inválido en la grabación: %', v_row.title;
        END IF;

        INSERT INTO attachments(recording_id, filename, file_path, file_type, attachment_type)
        VALUES (
          v_row.recording_id,
          trim(v_attachment->>'filename'),
          trim(v_attachment->>'file_path'),
          COALESCE(NULLIF(trim(v_attachment->>'file_type'), ''), 'application/octet-stream'),
          v_attachment_type
        );
      END LOOP;
    END IF;
  END LOOP;
END
$$;
