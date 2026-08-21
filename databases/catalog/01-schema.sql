CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  code varchar(10) UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(10) UNIQUE NOT NULL,
  name varchar(150) NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id),
  credits int,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  term int NOT NULL CHECK (term IN (1, 2)),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (year, term)
);

CREATE TABLE professors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(150) NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT professors_institutional_email CHECK (
    email ~* '^[^\s@]+@(ingenieria\.usac\.edu\.gt|ing\.usac\.edu\.gt)$'
  )
);

CREATE TABLE course_staff (
  course_id uuid NOT NULL REFERENCES courses(id),
  professor_id uuid NOT NULL REFERENCES professors(id),
  role_type varchar(20) NOT NULL CHECK (role_type IN ('professor', 'assistant')),
  assigned_by_email varchar(255),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, professor_id)
);

CREATE TABLE recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(200) NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id),
  semester_id uuid NOT NULL REFERENCES semesters(id),
  lecture_date date,
  unit varchar(100),
  topic varchar(200),
  video_path text,
  is_published boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recording_professors (
  recording_id uuid NOT NULL REFERENCES recordings(id),
  professor_id uuid NOT NULL REFERENCES professors(id),
  role_type varchar(20) NOT NULL CHECK (role_type IN ('professor', 'assistant')),
  PRIMARY KEY (recording_id, professor_id)
);

CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL
);

CREATE UNIQUE INDEX topics_name_lower_unique ON topics (lower(name));

CREATE TABLE recording_topics (
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (recording_id, topic_id)
);

CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  filename varchar(255) NOT NULL,
  file_path text NOT NULL,
  file_type varchar(100) NOT NULL DEFAULT 'application/octet-stream',
  attachment_type varchar(20) NOT NULL DEFAULT 'material'
    CHECK (attachment_type IN ('syllabus', 'material')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ratings (
  user_id uuid NOT NULL,
  recording_id uuid NOT NULL REFERENCES recordings(id),
  vote boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recording_id)
);

CREATE OR REPLACE FUNCTION recommendation_percentage(p_recording uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE vote) / NULLIF(COUNT(*), 0),
      2
    ),
    0
  )
  FROM ratings
  WHERE recording_id = p_recording
$$;

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

CREATE VIEW recording_detail AS
SELECT *
FROM published_catalog;

CREATE OR REPLACE FUNCTION touch_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

CREATE TRIGGER ratings_updated
BEFORE UPDATE ON ratings
FOR EACH ROW
EXECUTE FUNCTION touch_rating();
