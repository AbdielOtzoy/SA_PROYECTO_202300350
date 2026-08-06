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
        <p>Consulta la información personal asociada a tu cuenta.</p>
      </section>
      <section className="account-grid profile-only">
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
        </article>
      </section>
    </AppShell>
  );
}
