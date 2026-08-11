'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../../components/api';
import { Icon } from '../../../components/Icon';
import { Toast, type ToastVariant } from '../../../components/Toast';

type Kind = 'catalog' | 'recordings' | 'enrollments';
type ToastState = { message: string; variant: ToastVariant };

const labels: Record<Kind, { title: string; description: string; icon: 'catalog' | 'video' | 'book' }> = {
  catalog: { title: 'Catálogo académico', description: 'Escuelas, cursos y semestres.', icon: 'catalog' },
  recordings: { title: 'Grabaciones', description: 'Contenido de cursos asignados.', icon: 'video' },
  enrollments: { title: 'Inscripciones', description: 'Matrículas y credenciales académicas.', icon: 'book' },
};

export default function ImportsPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const isAdmin = profile?.roles.includes('admin') === true;
  const isManager = profile?.roles.some((role) => ['admin', 'teacher', 'assistant'].includes(role)) === true;

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  async function importCsv(kind: Kind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await request<{ rows: number; procedure: string }>(`/admin/imports/${kind}`, {
        method: 'POST',
        body: form,
      });
      setToast({ message: `${result.rows} filas procesadas por ${result.procedure}.`, variant: 'success' });
    } catch (cause: unknown) {
      setToast({ message: errorMessage(cause), variant: 'error' });
    }
    event.target.value = '';
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="notice">Validando permisos…</p>
      </AppShell>
    );
  }

  if (!isManager) {
    return (
      <AppShell admin={isAdmin}>
        <p className="notice">403 · Tu rol no puede realizar importaciones.</p>
      </AppShell>
    );
  }

  const kinds = (Object.keys(labels) as Kind[]).filter((kind) => isAdmin || kind === 'recordings');

  return (
    <AppShell admin={isAdmin}>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL · DATOS</p>
        <h1>Importaciones CSV</h1>
        <p>Selecciona un archivo UTF-8. Se valida completo y se confirma mediante una única transacción.</p>
      </section>
      <section className="import-page-grid">
        {kinds.map((kind) => (
          <label className="import-page-card panel" key={kind}>
            <span className="import-page-icon">
              <Icon name={labels[kind].icon} />
            </span>
            <strong>{labels[kind].title}</strong>
            <p>{labels[kind].description}</p>
            <span className="button">Seleccionar CSV</span>
            <input type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(kind, event)} />
          </label>
        ))}
      </section>
      <section className="panel import-help">
        <h2>Reglas de carga</h2>
        <p>El tamaño máximo inicial es 5 MiB, los encabezados son obligatorios y repetir el archivo es idempotente.</p>
        {!isAdmin && (
          <p className="muted">Como docente o auxiliar solo puedes importar grabaciones de cursos asignados.</p>
        )}
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
