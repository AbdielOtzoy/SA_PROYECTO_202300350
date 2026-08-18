'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { Icon } from '../../components/Icon';
import { errorMessage, request, type SessionResponse } from '../../components/api';
import { Toast } from '../../components/Toast';

type Profile = { full_name?: string; fullName?: string; email: string };
type Preferences = { new_recording: boolean; admin_notice: boolean; recovery: boolean; security: boolean };
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
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    Promise.all([
      request<SessionResponse>('/session'),
      request<{ preferences: Preferences }>('/notifications/preferences'),
    ])
      .then(([session, response]) => {
        setProfile(session.user);
        setPreferences(response.preferences);
      })
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, []);
  async function savePreferences() {
    if (!preferences) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await request<{ preferences: Preferences }>('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          new_recording: preferences.new_recording,
          admin_notice: preferences.admin_notice,
        }),
      });
      setPreferences(response.preferences);
      setSaved(true);
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  const name = profile?.full_name || profile?.fullName || 'Usuario';
  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">REFERENCIAS</p>
        <h1>Configuración de cuenta</h1>
        <p>Consulta la información personal asociada a tu cuenta.</p>
      </section>
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
        </article>
        <article className="preferences-card panel">
          <div className="section-heading-row">
            <div>
              <h2>Preferencias de correo</h2>
              <p>Controla los avisos opcionales que recibes en tu cuenta.</p>
            </div>
            <Icon name="bell" size={22} />
          </div>
          {preferences ? (
            <>
              <label className="preference-row">
                <span>
                  <strong>Nuevas grabaciones</strong>
                  <small>Recibe avisos cuando se publique una clase de tus cursos.</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.new_recording}
                  onChange={(event) => setPreferences({ ...preferences, new_recording: event.target.checked })}
                />
              </label>
              <label className="preference-row">
                <span>
                  <strong>Avisos administrativos</strong>
                  <small>Recibe comunicados dirigidos a tus roles o cursos.</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.admin_notice}
                  onChange={(event) => setPreferences({ ...preferences, admin_notice: event.target.checked })}
                />
              </label>
              <div className="mandatory-preferences">
                <p>Correos obligatorios</p>
                <span>
                  <Icon name="check" size={16} /> Recuperación de acceso
                </span>
                <span>
                  <Icon name="check" size={16} /> Seguridad de cuenta
                </span>
              </div>
              <button className="button" type="button" onClick={() => void savePreferences()} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar preferencias'}
              </button>
              {saved && <p className="form-message success-message">Preferencias actualizadas.</p>}
            </>
          ) : (
            <p className="muted">Cargando preferencias…</p>
          )}
        </article>
      </section>
      {error && <Toast message={error} variant="error" onClose={() => setError('')} />}
    </AppShell>
  );
}
