'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, request } from '../components/api';
import { Icon } from '../components/Icon';
import { Toast } from '../components/Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const response = await request<{ user: { roles: string[] } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const roles = response.user.roles || [];
      router.replace(
        roles.includes('admin')
          ? '/admin'
          : roles.includes('teacher')
            ? '/docente'
            : roles.includes('assistant')
              ? '/auxiliar'
              : '/catalogo',
      );
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  }
  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">yoUSAC</div>
        <div className="login-visual-content">
          <span className="login-kicker">ACERVO ACADÉMICO DIGITAL</span>
          <h1>Aprende a tu ritmo.</h1>
          <p>
            Accede a las grabaciones de tus cursos, retoma tus clases y estudia con el respaldo de tu comunidad
            universitaria.
          </p>
        </div>
        <div className="login-progress" />
        <div className="login-faculty">Facultad de Ingeniería · USAC</div>
      </section>
      <section className="login-form-wrap">
        <h1>Bienvenido a YoUSAC</h1>
        <p className="login-lead">Ingresa con tu cuenta institucional para continuar.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="form-label">Correo institucional</label>
          <div className="input-wrap">
            <Icon name="mail" />
            <input
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="usuario@ingenieria.usac.edu.gt"
              required
              aria-label="Correo institucional"
            />
          </div>
          <label className="form-label">Contraseña</label>
          <div className="input-wrap">
            <Icon name="lock" />
            <input
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              required
              aria-label="Contraseña"
            />
            <button
              className="icon-button right-icon"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Mostrar contraseña"
            >
              <Icon name="eye" />
            </button>
          </div>
          <a className="login-forgot" href="/recuperar">
            ¿Olvidaste tu contraseña?
          </a>
          <button className="button full" type="submit">
            Iniciar sesión
          </button>
          <div className="or">o</div>
          <button className="oauth" type="button" onClick={() => window.location.assign('/api/auth/google')}>
            <Icon name="shield" color="#0969ff" />
            Continuar con OAuth institucional
          </button>
        </form>
        <p className="login-register">
          ¿Aún no tienes cuenta? <a href="/registro">Regístrate aquí</a>
        </p>
        <p className="login-domains">Solo se admiten correos @ingenieria.usac.edu.gt y @ing.usac.edu.gt.</p>
      </section>
      {error && <Toast message={error} variant="error" onClose={() => setError('')} />}
    </main>
  );
}
