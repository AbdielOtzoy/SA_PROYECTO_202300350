CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  code varchar(10) UNIQUE NOT NULL
);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(10) UNIQUE NOT NULL,
  name varchar(150) NOT NULL,
  school_id uuid NOT NULL REFERENCES schools(id),
  credits int
);

CREATE TABLE semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  term int NOT NULL
);

CREATE TABLE professors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(150) NOT NULL,
  email varchar(255) UNIQUE NOT NULL
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
  r.title,
  c.code course_code,
  c.name course,
  s.name school,
  (se.year::text || '-' || se.term::text) semester,
  r.unit,
  r.topic,
  r.video_path,
  recommendation_percentage(r.id) recommendation
FROM recordings r
JOIN courses c ON c.id = r.course_id
JOIN schools s ON s.id = c.school_id
JOIN semesters se ON se.id = r.semester_id
WHERE r.is_published;

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
