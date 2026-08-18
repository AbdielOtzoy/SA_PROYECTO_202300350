-- DER — Notificaciones (PostgreSQL) · notification_db

CREATE TABLE "templates" (
  "id" uuid PRIMARY KEY,
  "code" varchar(50) UNIQUE NOT NULL,
  "subject" varchar(200) NOT NULL,
  "body_html" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "user_preferences" (
  "user_id" uuid NOT NULL,
  "notification_type" varchar(30) NOT NULL,
  "is_enabled" boolean NOT NULL DEFAULT true,
  PRIMARY KEY ("user_id", "notification_type")
);

CREATE TABLE "email_queue" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "params_json" jsonb,
  "status" varchar(20) NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "available_at" timestamptz NOT NULL DEFAULT now(),
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz
);

CREATE TABLE "email_log" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "subject" varchar(200) NOT NULL,
  "body" text NOT NULL,
  "sent_at" timestamptz,
  "status" varchar(20) NOT NULL
);

COMMENT ON TABLE "templates" IS 'Plantillas de correo reutilizables';
COMMENT ON TABLE "user_preferences" IS 'Preferencias de notificación por usuario';
COMMENT ON TABLE "email_queue" IS 'Cola de correos pendientes de envío';
COMMENT ON TABLE "email_log" IS 'Historial de correos enviados';

ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_template_fk" FOREIGN KEY ("template_id") REFERENCES "templates" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "email_log" ADD CONSTRAINT "email_log_template_fk" FOREIGN KEY ("template_id") REFERENCES "templates" ("id") DEFERRABLE INITIALLY IMMEDIATE;
