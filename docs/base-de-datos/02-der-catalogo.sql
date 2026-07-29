-- DER — Catálogo (PostgreSQL) · catalog_db

CREATE TABLE "schools" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "code" varchar(10) UNIQUE NOT NULL
);

CREATE TABLE "courses" (
  "id" uuid PRIMARY KEY,
  "code" varchar(10) UNIQUE NOT NULL,
  "name" varchar(150) NOT NULL,
  "school_id" uuid NOT NULL,
  "credits" int
);

CREATE TABLE "semesters" (
  "id" uuid PRIMARY KEY,
  "year" int NOT NULL,
  "term" int NOT NULL
);

CREATE TABLE "professors" (
  "id" uuid PRIMARY KEY,
  "full_name" varchar(150) NOT NULL,
  "email" varchar(255) UNIQUE NOT NULL
);

CREATE TABLE "recordings" (
  "id" uuid PRIMARY KEY,
  "title" varchar(200) NOT NULL,
  "course_id" uuid NOT NULL,
  "semester_id" uuid NOT NULL,
  "lecture_date" date,
  "unit" varchar(100),
  "topic" varchar(200),
  "video_path" text,
  "is_published" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "recording_professors" (
  "recording_id" uuid NOT NULL,
  "professor_id" uuid NOT NULL,
  "role_type" varchar(20) NOT NULL CHECK ("role_type" IN ('professor', 'assistant')),
  PRIMARY KEY ("recording_id", "professor_id")
);

CREATE TABLE "topics" (
  "id" uuid PRIMARY KEY,
  "name" varchar(100) UNIQUE NOT NULL
);

CREATE TABLE "recording_topics" (
  "recording_id" uuid NOT NULL,
  "topic_id" uuid NOT NULL,
  PRIMARY KEY ("recording_id", "topic_id")
);

CREATE TABLE "attachments" (
  "id" uuid PRIMARY KEY,
  "recording_id" uuid NOT NULL,
  "filename" varchar(255) NOT NULL,
  "file_path" text NOT NULL,
  "file_type" varchar(50)
);

CREATE TABLE "ratings" (
  "user_id" uuid NOT NULL,
  "recording_id" uuid NOT NULL,
  "vote" boolean NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "recording_id")
);

COMMENT ON TABLE "schools" IS 'Escuelas o áreas académicas';
COMMENT ON TABLE "courses" IS 'Cursos de cada escuela';
COMMENT ON TABLE "semesters" IS 'Períodos académicos';
COMMENT ON TABLE "professors" IS 'Catedráticos y auxiliares';
COMMENT ON TABLE "recordings" IS 'Grabaciones de clases publicadas';
COMMENT ON TABLE "recording_professors" IS 'Asignación de catedráticos a grabaciones';
COMMENT ON TABLE "topics" IS 'Temas y etiquetas académicas';
COMMENT ON TABLE "recording_topics" IS 'Asignación de temas a grabaciones';
COMMENT ON TABLE "attachments" IS 'Materiales adjuntos a grabaciones';
COMMENT ON TABLE "ratings" IS 'Valoraciones de usuarios sobre grabaciones';

ALTER TABLE "courses" ADD CONSTRAINT "courses_school_fk" FOREIGN KEY ("school_id") REFERENCES "schools" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "recordings" ADD CONSTRAINT "recordings_course_fk" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_semester_fk" FOREIGN KEY ("semester_id") REFERENCES "semesters" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "recording_professors" ADD CONSTRAINT "recording_professors_recording_fk" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "recording_professors" ADD CONSTRAINT "recording_professors_professor_fk" FOREIGN KEY ("professor_id") REFERENCES "professors" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "recording_topics" ADD CONSTRAINT "recording_topics_recording_fk" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "recording_topics" ADD CONSTRAINT "recording_topics_topic_fk" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_recording_fk" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_recording_fk" FOREIGN KEY ("recording_id") REFERENCES "recordings" ("id") DEFERRABLE INITIALLY IMMEDIATE;
