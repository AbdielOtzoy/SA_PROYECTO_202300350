CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_active_idx
  ON password_reset_tokens (user_id, expires_at)
  WHERE used_at IS NULL;

CREATE OR REPLACE FUNCTION audit_password_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO credential_audit_log (user_id, change_type, old_value_hash, new_value_hash)
  VALUES (
    NEW.id,
    'PASSWORD_UPDATE',
    encode(digest(OLD.password_hash, 'sha256'), 'hex'),
    encode(digest(NEW.password_hash, 'sha256'), 'hex')
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS users_password_audit ON users;
CREATE TRIGGER users_password_audit
AFTER UPDATE OF password_hash ON users
FOR EACH ROW
WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
EXECUTE FUNCTION audit_password_change();
