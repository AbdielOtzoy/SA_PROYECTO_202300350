INSERT INTO templates (id, code, subject, body_html)
VALUES
  (
    '00000000-0000-0000-0000-000000000401',
    'registration',
    'Bienvenido a YoUSAC',
    '<p>Tu cuenta fue creada.</p>'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    'recovery',
    'Recuperación de acceso',
    '<p>Solicitud de recuperación.</p><p><a href="{{recovery_url}}">Restablecer contraseña</a></p>'
  ),
  (
    '00000000-0000-0000-0000-000000000403',
    'security',
    'Aviso de seguridad de YoUSAC',
    '<p>Se realizó un cambio de seguridad en tu cuenta.</p>'
  ),
  (
    '00000000-0000-0000-0000-000000000404',
    'new_recording',
    'Nueva grabación disponible',
    '<p>La grabación {{title}} del curso {{course}} ya está disponible.</p><p><a href="{{recording_url}}">Ver grabación</a></p>'
  ),
  (
    '00000000-0000-0000-0000-000000000405',
    'admin_notice',
    '{{subject}}',
    '{{body}}'
  );
