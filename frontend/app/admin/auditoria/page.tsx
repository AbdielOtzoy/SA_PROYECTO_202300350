'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../../components/api';
import { Toast, type ToastVariant } from '../../../components/Toast';

type MostViewed = { recording_id: string; views: number };
type ToastState = { message: string; variant: ToastVariant };

export default function AuditPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<MostViewed[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  useEffect(() => {
    if (!profile?.roles.includes('admin')) return;
    request<{ items: MostViewed[] }>('/admin/analytics/most-viewed')
      .then((response) => setItems(response.items || []))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, [profile]);

  if (!profile) {
    return (
      <AppShell admin>
        <p className="notice">Validando permisos…</p>
      </AppShell>
    );
  }

  if (!profile.roles.includes('admin')) {
    return (
      <AppShell admin>
        <p className="notice">403 · Solo un administrador puede consultar auditoría.</p>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL · SEGUIMIENTO</p>
        <h1>Auditoría</h1>
        <p>Actividad de reproducción agregada por el servicio de analítica.</p>
      </section>
      <section className="panel audit-panel">
        <h2>Grabaciones más vistas</h2>
        {items.length ? (
          <div className="audit-list">
            {items.map((item, index) => (
              <div className="audit-row" key={item.recording_id}>
                <strong>#{index + 1}</strong>
                <span>{item.recording_id}</span>
                <b>{item.views} reproducciones</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Aún no hay actividad agregada para mostrar.</p>
        )}
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
