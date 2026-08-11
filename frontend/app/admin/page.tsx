'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../components/api';
import { Icon } from '../../components/Icon';
import { Toast, type ToastVariant } from '../../components/Toast';
import type { Course, ListResponse, Professor, School, Staff } from '../../components/admin/types';

type ToastState = { message: string; variant: ToastVariant };

export default function Admin() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [counts, setCounts] = useState({ schools: 0, courses: 0, professors: 0, staff: 0 });
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  useEffect(() => {
    if (!profile?.roles.includes('admin')) return;
    Promise.all([
      request<ListResponse<School>>('/admin/schools'),
      request<ListResponse<Course>>('/admin/courses'),
      request<ListResponse<Professor>>('/admin/professors'),
      request<{ assignments: Staff[] }>('/admin/course-staff'),
    ])
      .then(([schools, courses, professors, staff]) =>
        setCounts({
          schools: schools.schools?.length || 0,
          courses: courses.courses?.length || 0,
          professors: professors.professors?.length || 0,
          staff: staff.assignments?.length || 0,
        }),
      )
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, [profile]);

  if (!profile) {
    return (
      <AppShell admin>
        <p className="notice">Validando permisos del panel…</p>
      </AppShell>
    );
  }

  if (!profile.roles.includes('admin')) {
    return (
      <AppShell admin>
        <p className="notice">403 · Solo un administrador puede consultar este resumen.</p>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL</p>
        <h1>Administración académica</h1>
        <p>Un espacio separado para consultar el estado y acceder a cada módulo de gestión.</p>
      </section>

      <section className="metrics-grid">
        <Metric label="Escuelas" value={counts.schools} description="Catálogo activo" />
        <Metric label="Cursos" value={counts.courses} description="Catálogo académico" />
        <Metric label="Docentes" value={counts.professors} description="Roles asignables" />
        <Metric label="Asignaciones" value={counts.staff} description="Curso · docente" />
      </section>

      <section className="admin-shortcuts">
        <AdminShortcut
          href="/admin/contenido"
          title="Configuración académica"
          description="Semestres, escuelas, cursos, docentes y asignaciones."
          icon="settings"
        />
        <AdminShortcut
          href="/admin/usuarios-roles"
          title="Usuarios y roles"
          description="Consulta cuentas y administra roles autorizados."
          icon="users"
        />
        <AdminShortcut
          href="/admin/importaciones"
          title="Importaciones CSV"
          description="Carga catálogos, grabaciones e inscripciones con rollback."
          icon="upload"
        />
        <AdminShortcut
          href="/admin/exportaciones"
          title="Exportaciones"
          description="Descarga respaldos CSV de la información académica."
          icon="database"
        />
        <AdminShortcut
          href="/admin/auditoria"
          title="Auditoría"
          description="Consulta la actividad de reproducción más relevante."
          icon="audit"
        />
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}

function Metric({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <article className="metric panel">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function AdminShortcut({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: 'video' | 'users' | 'upload' | 'database' | 'audit' | 'settings';
}) {
  return (
    <Link href={href} className="admin-shortcut panel">
      <span className="admin-shortcut-icon">
        <Icon name={icon} />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="admin-shortcut-arrow">→</span>
    </Link>
  );
}
