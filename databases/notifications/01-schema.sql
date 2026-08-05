CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE templates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(50) UNIQUE NOT NULL, subject varchar(200) NOT NULL, body_html text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE user_preferences (user_id uuid NOT NULL, notification_type varchar(30) NOT NULL, is_enabled boolean NOT NULL DEFAULT true, PRIMARY KEY(user_id,notification_type));
CREATE TABLE email_queue (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, template_id uuid REFERENCES templates(id), recipient varchar(255) NOT NULL, params_json jsonb, status varchar(20) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz);
CREATE TABLE email_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, template_id uuid REFERENCES templates(id), recipient varchar(255) NOT NULL, subject varchar(200) NOT NULL, body text NOT NULL, sent_at timestamptz, status varchar(20) NOT NULL);
CREATE OR REPLACE FUNCTION audit_email_queue() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO email_log(user_id,template_id,recipient,subject,body,sent_at,status) VALUES(NEW.user_id,NEW.template_id,NEW.recipient,'Notificación YoUSAC',COALESCE(NEW.params_json::text,''),now(),NEW.status); RETURN NEW; END $$;
CREATE TRIGGER email_queue_audit AFTER INSERT ON email_queue FOR EACH ROW EXECUTE FUNCTION audit_email_queue();

