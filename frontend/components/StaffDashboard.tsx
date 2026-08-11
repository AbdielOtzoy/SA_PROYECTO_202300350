'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from './AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from './api';
import { Icon } from './Icon';
import { Toast, type ToastVariant } from './Toast';
import type { Staff } from './admin/types';

type StaffRole = 'teacher' | 'assistant';
type ToastState = { message: string; variant: ToastVariant };

export function StaffDashboard({ role }: { role: StaffRole }) {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [assignments, setAssignments] = useState<Staff[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const roleName = role === 'teacher' ? 'docente' : 'auxiliar';

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  useEffect(() => {
    if (!profile?.roles.includes(role)) return;
    request<{ assignments: Staff[] }>('/admin/course-staff')
      .then((response) => setAssignments(response.assignments || []))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, [profile, role]);

  if (!profile) {
    return (
      <AppShell>
        <p className="notice">Validando sesión…</p>
      </AppShell>
    );
  }

  if (!profile.roles.includes(role)) {
    return (
      <AppShell>
        <p className="notice">403 · Esta ruta está reservada para el área de {roleName}.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">ÁREA ACADÉMICA · {role === 'teacher' ? 'DOCENTE' : 'AUXILIAR'}</p>
        <h1>Panel del {roleName}</h1>
        <p>Consulta tus cursos asignados y administra las grabaciones autorizadas.</p>
      </section>

      <section className="staff-actions">
        <Link className="button" href="/catalogo">
          <Icon name="video" size={18} /> Explorar catálogo
        </Link>
        <Link className="button alt" href="/admin/importaciones">
          <Icon name="upload" size={18} /> Gestionar grabaciones
        </Link>
      </section>

      <section className="panel staff-assignment-panel">
        <div className="catalog-section-head">
          <h2>Mis cursos asignados</h2>
          <span>{assignments.length} asignaciones</span>
        </div>
        {assignments.length ? (
          <div className="staff-course-grid">
            {assignments.map((assignment) => (
              <article className="staff-course-card" key={`${assignment.course_id}-${assignment.professor_id}`}>
                <span className="course-link">{assignment.course_code}</span>
                <h3>{assignment.professor_name}</h3>
                <p>{assignment.role_type === 'assistant' ? 'Auxiliar' : 'Catedrático'}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No tienes cursos asignados en este momento.</p>
        )}
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
