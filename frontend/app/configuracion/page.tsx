'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { Icon } from '../../components/Icon';
import { request, type SessionResponse } from '../../components/api';

type Profile = { full_name?: string; fullName?: string; email: string };
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'US'
  );
}

export default function Settings() {
  const [classes, setClasses] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch(() => undefined);
  }, []);
  const name = profile?.full_name || profile?.fullName || 'Usuario';
  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">REFERENCIAS</p>
        <h1>Configuración de cuenta</h1>
        <p>Administra tu información, preferencias y seguridad.</p>
      </section>
      <div className="tabs">
        <button className="tab active">Perfil</button>
        <button className="tab">Notificaciones</button>
        <button className="tab">Seguridad</button>
      </div>
      <section className="account-grid">
        <article className="personal-card panel">
          <h2>Información personal</h2>
          <div className="personal-info">
            <div className="large-avatar">{initials(name)}</div>
            <div>
              <h3>{name}</h3>
              <p>{profile?.email || 'Cargando…'}</p>
              <span className="verified">
                <Icon name="check" size={18} />
                Correo verificado
              </span>
            </div>
          </div>
          <button className="button alt">Editar información</button>
        </article>
        <article className="preferences-card panel">
          <h2>Preferencias de correo</h2>
          <div className="pref">
            <div>
              <strong>Nuevas clases publicadas</strong>
              <span>Avisos de tus cursos inscritos</span>
            </div>
            <button
              onClick={() => setClasses(!classes)}
              className={`switch ${classes ? 'on' : ''}`}
              aria-label="Cambiar avisos de clases"
            />
          </div>
          <div className="pref">
            <div>
              <strong>Avisos administrativos</strong>
              <span>Puedes deshabilitar tus avisos administrativos</span>
            </div>
            <button
              onClick={() => setAdmin(!admin)}
              className={`switch ${admin ? 'on' : ''}`}
              aria-label="Cambiar avisos administrativos"
            />
          </div>
        </article>
        <article className="security-card panel">
          <Icon name="shield" size={34} />
          <div>
            <h2>Seguridad de la cuenta</h2>
            <p>Las alertas de seguridad y recuperación siempre están activas.</p>
            <div className="security-row">
              <div>
                <h3>Sesión web</h3>
                <p>Expira después de 60 minutos de inactividad</p>
                <button className="button alt" style={{ marginTop: 20 }}>
                  Cambiar contraseña
                </button>
              </div>
              <span className="badge green">Protegida · HttpOnly</span>
            </div>
          </div>
        </article>
        <p className="last-access">Último acceso: hoy, 08:42 · Ciudad de Guatemala</p>
      </section>
    </AppShell>
  );
}
