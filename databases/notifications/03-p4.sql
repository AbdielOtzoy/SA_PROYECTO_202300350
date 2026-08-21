ALTER TABLE email_queue
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE email_queue
  DROP CONSTRAINT IF EXISTS email_queue_status_check;

ALTER TABLE email_queue
  ADD CONSTRAINT email_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed'));

CREATE INDEX IF NOT EXISTS email_queue_pending_idx
  ON email_queue (available_at, created_at)
  WHERE status IN ('pending', 'processing');

DROP TRIGGER IF EXISTS email_queue_audit ON email_queue;
DROP FUNCTION IF EXISTS audit_email_queue();

INSERT INTO templates (code, subject, body_html)
VALUES
  ('recovery', 'Recuperación de acceso', '<p>Solicitud de recuperación.</p><p><a href="{{recovery_url}}">Restablecer contraseña</a></p>'),
  ('security', 'Aviso de seguridad de YoUSAC', '<p>Se realizó un cambio de seguridad en tu cuenta.</p>'),
  ('new_recording', 'Nueva grabación disponible', '<p>La grabación {{title}} del curso {{course}} ya está disponible.</p><p><a href="{{recording_url}}">Ver grabación</a></p>'),
  ('admin_notice', '{{subject}}', '{{body}}')
ON CONFLICT (code) DO UPDATE SET subject=EXCLUDED.subject,body_html=EXCLUDED.body_html;
