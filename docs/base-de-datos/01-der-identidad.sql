-- DER — Identidad (PostgreSQL) · identity_db

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "email" varchar(255) UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "full_name" varchar(150) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY,
  "name" varchar(50) UNIQUE NOT NULL,
  "description" text
);

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "description" text
);

CREATE TABLE "role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "user_roles" (
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "assigned_by" uuid,
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "role_id")
);

CREATE TABLE "user_enrollments" (
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "semester_id" uuid,
  "status" varchar(20) NOT NULL,
  "credentials" varchar(50),
  PRIMARY KEY ("user_id", "course_id")
);

CREATE TABLE "credential_audit_log" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "change_type" varchar(20) NOT NULL,
  "old_value_hash" text,
  "new_value_hash" text,
  "ip_address" inet,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE "users" IS 'Cuentas institucionales de la plataforma';
COMMENT ON TABLE "roles" IS 'Roles del sistema (Estudiante, Docente, Auxiliar, Admin)';
COMMENT ON TABLE "permissions" IS 'Permisos atómicos del sistema';
COMMENT ON TABLE "role_permissions" IS 'Asignación de permisos a roles (N:N)';
COMMENT ON TABLE "user_roles" IS 'Asignación de roles a usuarios (N:N)';
COMMENT ON TABLE "user_enrollments" IS 'Inscripción de estudiantes en cursos (RF-008, RF-026)';
COMMENT ON TABLE "credential_audit_log" IS 'Auditoría de cambios de credenciales y roles';

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_fk" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_fk" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fk" FOREIGN KEY ("assigned_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "credential_audit_log" ADD CONSTRAINT "credential_audit_log_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
