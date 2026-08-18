'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { Icon } from '../../components/Icon';
import { request } from '../../components/api';

type Enrollment = {
  user_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  semester_id: string;
  semester: string;
  semester_year: number;
  semester_term: number;
  status: string;
  credentials: string;
};

type SemesterOption = {
  id: string;
  year: number;
  term: number;
};

type EnrollmentsResponse = { enrollments: Enrollment[] };
type CatalogOptionsResponse = { semesters: { semesters: SemesterOption[] } };
type Filters = { semester: string; status: string; credentials: string };

const emptyFilters: Filters = { semester: '', status: '', credentials: '' };

function statusTone(status: string): 'green' | 'yellow' | 'gray' {
  const normalized = status.toLowerCase();
  if (['active', 'activo', 'approved', 'aprobado', 'regular'].includes(normalized)) return 'green';
  if (['pending', 'pendiente', 'in_progress', 'en_progreso'].includes(normalized)) return 'yellow';
  return 'gray';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Activa',
    activo: 'Activa',
    approved: 'Aprobada',
    aprobado: 'Aprobada',
    pending: 'Pendiente',
    pendiente: 'Pendiente',
    completed: 'Finalizada',
    finalizada: 'Finalizada',
    withdrawn: 'Retirada',
    retirada: 'Retirada',
  };
  return labels[status.toLowerCase()] || status || 'Sin estado';
}

export default function Courses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEnrollments = useCallback(async (nextFilters: Filters) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (nextFilters.semester) params.set('semester', nextFilters.semester);
    if (nextFilters.status.trim()) params.set('status', nextFilters.status.trim());
    if (nextFilters.credentials.trim()) params.set('credentials', nextFilters.credentials.trim());
    try {
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const response = await request<EnrollmentsResponse>(`/enrollments${suffix}`);
      setEnrollments(response.enrollments || []);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar tus cursos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEnrollments(emptyFilters);
    request<CatalogOptionsResponse>('/catalog/options')
      .then((response) => setSemesters(response.semesters?.semesters || []))
      .catch(() => setSemesters([]));
  }, [loadEnrollments]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadEnrollments(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    void loadEnrollments(emptyFilters);
  }

  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">PERFIL ACADÉMICO</p>
        <h1>Mis cursos inscritos</h1>
        <p>Consulta tus cursos asignados, el semestre correspondiente y tus credenciales académicas.</p>
      </section>

      <section className="courses-panel panel">
        <div className="courses-panel-heading">
          <div>
            <p className="section-label">FILTROS</p>
            <h2>Busca una inscripción</h2>
          </div>
          <Icon name="filter" size={24} />
        </div>
        <form className="courses-filter-row" onSubmit={applyFilters}>
          <label>
            Semestre
            <select
              className="field"
              value={filters.semester}
              onChange={(event) => setFilters({ ...filters, semester: event.target.value })}
            >
              <option value="">Todos los semestres</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.year}-{semester.term}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <input
              className="field"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              placeholder="Ej. active"
            />
          </label>
          <label>
            Credenciales
            <input
              className="field"
              value={filters.credentials}
              onChange={(event) => setFilters({ ...filters, credentials: event.target.value })}
              placeholder="Ej. regular"
            />
          </label>
          <div className="courses-filter-actions">
            <button className="button" type="submit" disabled={loading}>
              Aplicar filtros
            </button>
            <button className="button alt" type="button" onClick={clearFilters} disabled={loading}>
              Limpiar
            </button>
          </div>
        </form>
      </section>

      {loading && (
        <section className="courses-feedback panel" role="status">
          <Icon name="loader" size={28} />
          <p>Cargando tus cursos…</p>
        </section>
      )}

      {!loading && error && (
        <section className="courses-feedback panel" role="alert">
          <Icon name="alert" size={28} />
          <h2>No se pudieron cargar tus cursos</h2>
          <p>{error}</p>
          <button className="button" type="button" onClick={() => loadEnrollments(filters)}>
            Reintentar
          </button>
        </section>
      )}

      {!loading && !error && enrollments.length === 0 && (
        <section className="empty-state panel">
          <Icon name="book" size={38} />
          <h2>No hay cursos para estos filtros</h2>
          <p>Las inscripciones son asignadas por coordinación y aparecerán aquí cuando estén disponibles.</p>
        </section>
      )}

      {!loading && !error && enrollments.length > 0 && (
        <section className="courses-grid" aria-label="Cursos inscritos">
          {enrollments.map((enrollment) => (
            <article className="course-card panel" key={`${enrollment.course_id}-${enrollment.semester_id}`}>
              <div className="course-card-heading">
                <div>
                  <span className="section-label">{enrollment.course_code || 'CURSO'}</span>
                  <h2>{enrollment.course_name}</h2>
                </div>
                <span className={`badge ${statusTone(enrollment.status)}`}>{statusLabel(enrollment.status)}</span>
              </div>
              <div className="course-meta">
                <div>
                  <span>Semestre</span>
                  <strong>{enrollment.semester}</strong>
                </div>
                <div>
                  <span>Créditos</span>
                  <strong>{enrollment.credits || '—'}</strong>
                </div>
                <div>
                  <span>Credenciales</span>
                  <strong>{enrollment.credentials || 'No especificadas'}</strong>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
