'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../../components/api';
import { Icon } from '../../../components/Icon';
import { Toast, type ToastVariant } from '../../../components/Toast';
import type { Course, ListResponse, Professor, School, Semester, User } from '../../../components/admin/types';

type ExportKind = 'schools' | 'courses' | 'semesters' | 'professors' | 'users';
type ToastState = { message: string; variant: ToastVariant };

const labels: Record<ExportKind, string> = {
  schools: 'Escuelas',
  courses: 'Cursos',
  semesters: 'Semestres',
  professors: 'Docentes y auxiliares',
  users: 'Usuarios y roles',
};

export default function ExportsPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  async function exportData(kind: ExportKind) {
    try {
      let rows: unknown[];
      if (kind === 'schools') rows = (await request<ListResponse<School>>('/admin/schools')).schools || [];
      else if (kind === 'courses') rows = (await request<ListResponse<Course>>('/admin/courses')).courses || [];
      else if (kind === 'semesters') rows = (await request<ListResponse<Semester>>('/admin/semesters')).semesters || [];
      else if (kind === 'professors')
        rows = (await request<ListResponse<Professor>>('/admin/professors')).professors || [];
      else rows = (await request<{ users: User[] }>('/admin/users')).users || [];
      if (!rows.length) throw new Error('No hay datos para exportar.');
      const headers = Object.keys(rows[0] as Record<string, unknown>);
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => csvValue((row as Record<string, unknown>)[header])).join(',')),
      ].join('\n');
      const url = URL.createObjectURL(new Blob([`\ufeff${csv}\n`], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${kind}-yousac.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setToast({ message: `Exportación de ${labels[kind].toLowerCase()} descargada.`, variant: 'success' });
    } catch (cause: unknown) {
      setToast({ message: errorMessage(cause), variant: 'error' });
    }
  }

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
        <p className="notice">403 · Solo un administrador puede exportar información.</p>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL · RESPALDOS</p>
        <h1>Exportaciones</h1>
        <p>Descarga copias CSV de los catálogos y usuarios visibles para el administrador.</p>
      </section>
      <section className="export-grid">
        {(Object.keys(labels) as ExportKind[]).map((kind) => (
          <article className="panel export-card" key={kind}>
            <Icon name={kind === 'users' ? 'users' : kind === 'professors' ? 'user' : 'database'} />
            <h2>{labels[kind]}</h2>
            <p>Genera un archivo CSV actualizado.</p>
            <button className="button" type="button" onClick={() => void exportData(kind)}>
              Descargar CSV
            </button>
          </article>
        ))}
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}

function csvValue(value: unknown): string {
  const text = Array.isArray(value) ? value.join(';') : value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
