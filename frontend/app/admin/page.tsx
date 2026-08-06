'use client';
import { useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { errorMessage, request } from '../../components/api';
import { Icon } from '../../components/Icon';
const users = [
  ['Ana Morales', 'Estudiante', 'Activo'],
  ['Carlos Pérez', 'Docente · Auxiliar', 'Activo'],
  ['María López', 'Estudiante', 'Pendiente'],
  ['Diego Ruiz', 'Administrador', 'Activo'],
];
type AdminUser = { name: string; roles: string; state: 'Activo' | 'Pendiente' };
type Metric = { label: string; value: string; change: string; color: string };
type RoleResponse = { user: { roles: string[] } };

const adminUsers: AdminUser[] = users.map(([name, roles, state]) => ({
  name,
  roles,
  state: state as AdminUser['state'],
}));
const metrics: Metric[] = [
  { label: 'Usuarios activos', value: '1,248', change: '▲ 8.4%', color: '' },
  { label: 'Grabaciones publicadas', value: '386', change: '▲ 12.1%', color: '' },
  { label: 'Cursos registrados', value: '74', change: '— 0.0%', color: 'muted' },
  { label: 'Disponibilidad', value: '99.97%', change: '▲ 0.2%', color: 'green' },
];
export default function Admin() {
  const [userId, setUserId] = useState('00000000-0000-0000-0000-000000000002');
  const [role, setRole] = useState('teacher');
  const [message, setMessage] = useState('');
  async function update(assign: boolean) {
    try {
      const data = await request<RoleResponse>('/admin/users/' + userId + '/roles', {
        method: 'PUT',
        body: JSON.stringify({ role, assign }),
      });
      setMessage(`Roles actuales: ${data.user.roles.join(', ')}`);
    } catch (cause: unknown) {
      setMessage(errorMessage(cause));
    }
  }
  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h1>Resumen de la plataforma</h1>
        <p>Supervisa accesos, contenido y asignaciones académicas.</p>
      </section>
      <section className="metrics-grid">
        {metrics.map(({ label, value, change, color }) => (
          <article className="metric panel" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
            <small className={color}>{change}</small>
          </article>
        ))}
      </section>
      <section className="admin-content">
        <article className="roles-panel panel">
          <h2>Usuarios y roles</h2>
          <p>Las cuentas pueden acumular permisos de varios roles.</p>
          <div className="roles-tools">
            <div className="roles-search">
              <Icon name="search" />
              <input placeholder="Buscar usuario..." />
            </div>
            <button className="button">
              <Icon name="userAdd" />
              Asignar roles
            </button>
          </div>
          <table className="roles-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles acumulados</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(({ name, roles, state }) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{roles}</td>
                  <td>
                    <span className={`badge ${state === 'Activo' ? 'green' : 'yellow'}`}>{state}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            className="role-form"
            onSubmit={(e) => {
              e.preventDefault();
              update(true);
            }}
          >
            <label className="form-label">UUID de usuario</label>
            <input className="field" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <label className="form-label">Rol</label>
            <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
              {['student', 'teacher', 'assistant', 'admin'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <div>
              <button className="button">Asignar</button>
              <button type="button" className="button alt" onClick={() => update(false)} style={{ marginLeft: 12 }}>
                Revocar
              </button>
            </div>
            {message && <p className="form-message">{message}</p>}
          </form>
        </article>
        <aside className="admin-side">
          <article className="import-card panel">
            <Icon name="upload" size={34} />
            <h2>Importar datos</h2>
            <p>Carga catálogo, grabaciones o inscripciones mediante CSV.</p>
            <button className="button">Abrir importador</button>
          </article>
          <article className="activity-card panel">
            <h2>Actividad reciente</h2>
            <div className="activity">
              <Icon name="shield" />
              <p>
                Rol actualizado · Ana Morales<small>hace 12 min</small>
              </p>
            </div>
            <div className="activity">
              <Icon name="database" />
              <p>
                CSV de catálogo procesado<small>hace 38 min</small>
              </p>
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
