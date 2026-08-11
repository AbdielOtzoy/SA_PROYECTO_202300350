'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../../components/api';
import { Icon } from '../../../components/Icon';
import { Toast, type ToastVariant } from '../../../components/Toast';
import { roleLabels, type Professor, type Staff, type User } from '../../../components/admin/types';

type ToastState = { message: string; variant: ToastVariant };

export default function UserRolesPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [academicProfiles, setAcademicProfiles] = useState<Professor[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<Staff[]>([]);
  const [query, setQuery] = useState('');
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const isAdmin = profile?.roles.includes('admin') === true;

  function showToast(message: string, variant: ToastVariant = 'success') {
    setToast({ message, variant });
  }

  async function load() {
    try {
      const [userResponse, professorResponse, assignmentResponse] = await Promise.all([
        request<{ users: User[] }>('/admin/users'),
        request<{ professors: Professor[] }>('/admin/professors'),
        request<{ assignments: Staff[] }>('/admin/course-staff'),
      ]);
      setUsers(userResponse.users || []);
      setAcademicProfiles(professorResponse.professors || []);
      setCourseAssignments(assignmentResponse.assignments || []);
    } catch (cause: unknown) {
      showToast(errorMessage(cause), 'error');
    }
  }

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => showToast(errorMessage(cause), 'error'));
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        user.roles.some((role) => (roleLabels[role] || role).toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  const courseScopes = useMemo(() => {
    const scopes = new Map<string, string[]>();
    courseAssignments.forEach((assignment) => {
      const email = assignment.professor_email.toLowerCase();
      const current = scopes.get(email) || [];
      const label = `${assignment.course_code} · ${assignment.role_type === 'assistant' ? 'Auxiliar' : 'Catedrático'}`;
      if (!current.includes(label)) current.push(label);
      scopes.set(email, current);
    });
    return scopes;
  }, [courseAssignments]);

  const unlinkedProfiles = useMemo(() => {
    const userEmails = new Set(users.map((user) => user.email.toLowerCase()));
    return academicProfiles.filter((profile) => !userEmails.has(profile.email.toLowerCase()));
  }, [academicProfiles, users]);

  async function updateRole(userId: string, role: string, assign: boolean) {
    if (!role) return;
    try {
      await request(`/admin/users/${userId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ role, assign }),
      });
      showToast(`Rol ${assign ? 'asignado' : 'revocado'} correctamente.`);
      await load();
    } catch (cause: unknown) {
      showToast(errorMessage(cause), 'error');
    }
  }

  if (!profile) {
    return (
      <AppShell admin>
        <p className="notice">Validando permisos…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell admin>
        <p className="notice">403 · Solo un administrador puede gestionar usuarios y roles.</p>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL · ACCESO</p>
        <h1>Usuarios y roles</h1>
        <p>Consulta las cuentas activas y administra sus permisos de forma controlada.</p>
      </section>

      <section className="panel identity-explainer">
        <div>
          <p className="eyebrow">MODELO DE ACCESO</p>
          <h2>Perfil académico y cuenta de usuario son conceptos distintos</h2>
          <p>
            Los docentes y auxiliares se registran en la configuración académica. Para iniciar sesión necesitan además
            una cuenta en Identidad con el mismo correo institucional. El rol es global; los cursos autorizados se
            muestran por separado y se administran desde Configuración académica.
          </p>
        </div>
        <Link className="button alt" href="/admin/contenido">
          Configurar cursos y asignaciones
        </Link>
        {unlinkedProfiles.length > 0 && (
          <div className="unlinked-profiles">
            <strong>Perfiles académicos sin cuenta autenticable</strong>
            <p>Estos perfiles pueden aparecer en asignaciones, pero todavía no pueden iniciar sesión:</p>
            <ul>
              {unlinkedProfiles.map((academicProfile) => (
                <li key={academicProfile.id}>
                  {academicProfile.full_name} · {academicProfile.email}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel roles-panel">
        <div className="roles-tools">
          <label className="roles-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo o rol"
              aria-label="Buscar usuarios"
            />
          </label>
          <span className="roles-count">
            {filteredUsers.length} de {users.length} usuarios
          </span>
        </div>

        <div className="user-role-list">
          {filteredUsers.map((user) => (
            <article className="user-role-card" key={user.id}>
              <div className="user-role-identity">
                <div className="large-avatar">{initials(user.full_name)}</div>
                <div>
                  <h2>{user.full_name}</h2>
                  <p>{user.email}</p>
                  <div className="role-badges">
                    {user.roles.map((role) => (
                      <button
                        className="role-badge"
                        key={role}
                        type="button"
                        disabled={user.email === profile.email && role === 'admin'}
                        title={
                          user.email === profile.email && role === 'admin'
                            ? 'No puedes revocar tu propio acceso admin'
                            : 'Revocar rol'
                        }
                        onClick={() => void updateRole(user.id, role, false)}
                      >
                        {roleLabels[role] || role} <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                  <p className="user-scope">
                    <strong>Alcance académico:</strong>{' '}
                    {courseScopes.get(user.email.toLowerCase())?.length
                      ? courseScopes.get(user.email.toLowerCase())?.join(' · ')
                      : user.roles.some((role) => ['teacher', 'assistant'].includes(role))
                        ? 'Sin cursos asignados'
                        : 'No aplica para este rol'}
                  </p>
                </div>
              </div>
              <div className="user-role-actions">
                <label htmlFor={`role-${user.id}`}>Asignar rol global</label>
                <div className="role-action-row">
                  <select
                    id={`role-${user.id}`}
                    className="role-select"
                    value={pendingRole[user.id] || ''}
                    onChange={(event) => setPendingRole({ ...pendingRole, [user.id]: event.target.value })}
                  >
                    <option value="">Seleccionar rol</option>
                    {Object.entries(roleLabels).map(([role, label]) => (
                      <option key={role} value={role}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="button compact-button"
                    type="button"
                    disabled={!pendingRole[user.id]}
                    onClick={() => void updateRole(user.id, pendingRole[user.id], true)}
                  >
                    Asignar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!filteredUsers.length && <p className="muted">No se encontraron usuarios con ese criterio.</p>}
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}

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
