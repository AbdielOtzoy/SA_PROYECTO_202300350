CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,
  subject varchar(200) NOT NULL,
  body_html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_preferences (
  user_id uuid NOT NULL,
  notification_type varchar(30) NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, notification_type)
);

CREATE TABLE email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES templates(id),
  recipient varchar(255) NOT NULL,
  params_json jsonb,
  status varchar(20) NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX email_queue_pending_idx
  ON email_queue (available_at, created_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES templates(id),
  recipient varchar(255) NOT NULL,
  subject varchar(200) NOT NULL,
  body text NOT NULL,
  sent_at timestamptz,
  status varchar(20) NOT NULL
);
