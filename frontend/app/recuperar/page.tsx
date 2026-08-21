'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, request } from '../../components/api';
import { Icon } from '../../components/Icon';
import { Toast } from '../../components/Toast';

export default function RecoveryPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [sent, setSent] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!token) {
        await request('/auth/recovery/request', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setSent(true);
      } else {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
        await request('/auth/recovery/reset', {
          method: 'POST',
          body: JSON.stringify({ token, new_password: password }),
        });
        setCompleted(true);
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page recovery-page">
      <section className="login-visual">
        <div className="login-brand">yoUSAC</div>
        <div className="login-visual-content">
          <span className="login-kicker">ACCESO SEGURO</span>
          <h1>Vuelve a tus clases.</h1>
          <p>Recupera tu cuenta institucional con un enlace temporal enviado a tu correo.</p>
        </div>
        <div className="login-progress" />
        <div className="login-faculty">Facultad de Ingeniería · USAC</div>
      </section>
      <section className="login-form-wrap">
        <h1>{token ? 'Crea una nueva contraseña' : 'Recupera tu acceso'}</h1>
        <p className="login-lead">
          {token
            ? 'El enlace es válido por 30 minutos y solo puede utilizarse una vez.'
            : 'Indica tu correo institucional para recibir las instrucciones.'}
        </p>
        {sent ? (
          <div className="recovery-success">
            <Icon name="check" size={22} />
            <p>Si la cuenta existe, recibirás instrucciones en tu correo institucional.</p>
          </div>
        ) : completed ? (
          <div className="recovery-success">
            <Icon name="check" size={22} />
            <p>Tu contraseña fue actualizada correctamente.</p>
            <button className="button full" type="button" onClick={() => router.replace('/')}>
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={submit}>
            {!token ? (
              <>
                <label className="form-label" htmlFor="recovery-email">
                  Correo institucional
                </label>
                <div className="input-wrap">
                  <Icon name="mail" />
                  <input
                    id="recovery-email"
                    className="field"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="usuario@ingenieria.usac.edu.gt"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <label className="form-label" htmlFor="recovery-password">
                  Nueva contraseña
                </label>
                <div className="input-wrap">
                  <Icon name="lock" />
                  <input
                    id="recovery-password"
                    className="field"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    minLength={8}
                    required
                  />
                </div>
                <label className="form-label" htmlFor="recovery-confirmation">
                  Confirmar contraseña
                </label>
                <div className="input-wrap">
                  <Icon name="lock" />
                  <input
                    id="recovery-confirmation"
                    className="field"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    type="password"
                    minLength={8}
                    required
                  />
                </div>
              </>
            )}
            <button className="button full" type="submit" disabled={loading}>
              {loading ? 'Procesando…' : token ? 'Actualizar contraseña' : 'Enviar instrucciones'}
            </button>
          </form>
        )}
        <p className="login-register">
          <a href="/">Volver al inicio de sesión</a>
        </p>
      </section>
      {error && <Toast message={error} variant="error" onClose={() => setError('')} />}
    </main>
  );
}
