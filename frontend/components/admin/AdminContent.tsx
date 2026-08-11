'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../api';
import { Toast, type ToastVariant } from '../Toast';
import {
  emptyAssignment,
  emptyCourse,
  emptyProfessor,
  emptySchool,
  emptySemester,
  isInstitutionalEmail,
  type Course,
  type ListResponse,
  type Professor,
  type School,
  type Semester,
  type Staff,
} from './types';

type ToastState = { message: string; variant: ToastVariant };

export function AdminContent() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [schoolForm, setSchoolForm] = useState(emptySchool);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [semesterForm, setSemesterForm] = useState(emptySemester);
  const [professorForm, setProfessorForm] = useState(emptyProfessor);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);

  const isAdmin = profile?.roles.includes('admin') === true;

  function showToast(message: string, variant: ToastVariant = 'success') {
    setToast({ message, variant });
  }

  async function load() {
    try {
      const [schoolResponse, courseResponse, semesterResponse, professorResponse, staffResponse] = await Promise.all([
        request<ListResponse<School>>('/admin/schools'),
        request<ListResponse<Course>>('/admin/courses'),
        request<ListResponse<Semester>>('/admin/semesters'),
        request<ListResponse<Professor>>('/admin/professors'),
        request<{ assignments: Staff[] }>('/admin/course-staff'),
      ]);
      setSchools(schoolResponse.schools || []);
      setCourses(courseResponse.courses || []);
      setSemesters(semesterResponse.semesters || []);
      setProfessors(professorResponse.professors || []);
      setStaff(staffResponse.assignments || []);
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

  async function save(path: string, body: unknown, id: string, reset: () => void) {
    try {
      await request(path + (id ? `/${id}` : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      reset();
      showToast(id ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.');
      await load();
    } catch (cause: unknown) {
      showToast(errorMessage(cause), 'error');
    }
  }

  async function archive(path: string, id: string) {
    try {
      await request(`${path}/${id}`, { method: 'DELETE' });
      showToast('Registro archivado; no se eliminó físicamente.');
      await load();
    } catch (cause: unknown) {
      showToast(errorMessage(cause), 'error');
    }
  }

  async function assign(event: React.FormEvent) {
    event.preventDefault();
    await save('/admin/course-staff', assignmentForm, '', () => setAssignmentForm({ ...emptyAssignment }));
  }

  async function revoke(value: Staff) {
    try {
      await request(`/admin/course-staff?course_id=${value.course_id}&professor_id=${value.professor_id}`, {
        method: 'DELETE',
      });
      showToast('Asignación revocada correctamente.');
      await load();
    } catch (cause: unknown) {
      showToast(errorMessage(cause), 'error');
    }
  }

  if (!profile) {
    return (
      <AppShell admin>
        <p className="notice">Validando permisos del panel…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell admin>
        <p className="notice">403 · Solo un administrador puede gestionar el contenido académico.</p>
      </AppShell>
    );
  }

  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL · CONFIGURACIÓN</p>
        <h1>Configuración académica</h1>
        <p>Administra semestres, escuelas, cursos, docentes y sus asignaciones.</p>
      </section>

      <section className="admin-content">
        <EntityPanel
          title="Semestres"
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              '/admin/semesters',
              { year: Number(semesterForm.year), term: Number(semesterForm.term) },
              semesterForm.id,
              () => setSemesterForm({ ...emptySemester }),
            );
          }}
        >
          <input
            className="field"
            placeholder="Año"
            value={semesterForm.year}
            onChange={(event) => setSemesterForm({ ...semesterForm, year: event.target.value })}
          />
          <select
            className="field"
            value={semesterForm.term}
            onChange={(event) => setSemesterForm({ ...semesterForm, term: event.target.value })}
          >
            <option value="1">Primer semestre</option>
            <option value="2">Segundo semestre</option>
          </select>
          <button className="button">{semesterForm.id ? 'Actualizar' : 'Crear'} semestre</button>
          <ul className="admin-list">
            {semesters.map((value) => (
              <li key={value.id}>
                <span>
                  {value.year} · {value.term}° semestre
                </span>
                <button
                  type="button"
                  className="button alt"
                  onClick={() => setSemesterForm({ id: value.id, year: String(value.year), term: String(value.term) })}
                >
                  Editar
                </button>
                <button type="button" className="button alt" onClick={() => void archive('/admin/semesters', value.id)}>
                  Archivar
                </button>
              </li>
            ))}
          </ul>
        </EntityPanel>

        <EntityPanel
          title="Escuelas / áreas"
          onSubmit={(event) => {
            event.preventDefault();
            void save('/admin/schools', { name: schoolForm.name, code: schoolForm.code }, schoolForm.id, () =>
              setSchoolForm({ ...emptySchool }),
            );
          }}
        >
          <input
            className="field"
            placeholder="Nombre"
            value={schoolForm.name}
            onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })}
          />
          <input
            className="field"
            placeholder="Código"
            value={schoolForm.code}
            onChange={(event) => setSchoolForm({ ...schoolForm, code: event.target.value })}
          />
          <button className="button">{schoolForm.id ? 'Actualizar' : 'Crear'} escuela</button>
          <ul className="admin-list">
            {schools.map((value) => (
              <li key={value.id}>
                <span>
                  {value.code} · {value.name}
                </span>
                <button type="button" className="button alt" onClick={() => setSchoolForm({ ...value })}>
                  Editar
                </button>
                <button type="button" className="button alt" onClick={() => void archive('/admin/schools', value.id)}>
                  Archivar
                </button>
              </li>
            ))}
          </ul>
        </EntityPanel>
      </section>

      <section className="admin-content">
        <EntityPanel
          title="Cursos"
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              '/admin/courses',
              {
                code: courseForm.code,
                name: courseForm.name,
                school_id: courseForm.school_id,
                credits: Number(courseForm.credits),
              },
              courseForm.id,
              () => setCourseForm({ ...emptyCourse }),
            );
          }}
        >
          <input
            className="field"
            placeholder="Código"
            value={courseForm.code}
            onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })}
          />
          <input
            className="field"
            placeholder="Nombre"
            value={courseForm.name}
            onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })}
          />
          <select
            className="field"
            value={courseForm.school_id}
            onChange={(event) => setCourseForm({ ...courseForm, school_id: event.target.value })}
          >
            <option value="">Escuela</option>
            {schools.map((value) => (
              <option key={value.id} value={value.id}>
                {value.code}
              </option>
            ))}
          </select>
          <input
            className="field"
            type="number"
            min="0"
            placeholder="Créditos"
            value={courseForm.credits}
            onChange={(event) => setCourseForm({ ...courseForm, credits: event.target.value })}
          />
          <button className="button">{courseForm.id ? 'Actualizar' : 'Crear'} curso</button>
          <ul className="admin-list">
            {courses.map((value) => (
              <li key={value.id}>
                <span>
                  {value.code} · {value.name}
                </span>
                <button
                  type="button"
                  className="button alt"
                  onClick={() =>
                    setCourseForm({
                      id: value.id,
                      name: value.name,
                      code: value.code,
                      school_id: value.school_id,
                      credits: String(value.credits),
                    })
                  }
                >
                  Editar
                </button>
                <button type="button" className="button alt" onClick={() => void archive('/admin/courses', value.id)}>
                  Archivar
                </button>
              </li>
            ))}
          </ul>
        </EntityPanel>

        <EntityPanel
          title="Docentes y auxiliares"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isInstitutionalEmail(professorForm.email)) {
              showToast('El correo debe pertenecer a @ingenieria.usac.edu.gt o @ing.usac.edu.gt.', 'error');
              return;
            }
            void save(
              '/admin/professors',
              { full_name: professorForm.full_name, email: professorForm.email.trim().toLowerCase() },
              professorForm.id,
              () => setProfessorForm({ ...emptyProfessor }),
            );
          }}
        >
          <input
            className="field"
            placeholder="Nombre completo"
            value={professorForm.full_name}
            onChange={(event) => setProfessorForm({ ...professorForm, full_name: event.target.value })}
          />
          <input
            className="field"
            type="email"
            placeholder="usuario@ingenieria.usac.edu.gt"
            value={professorForm.email}
            onChange={(event) => setProfessorForm({ ...professorForm, email: event.target.value })}
          />
          <small className="field-help">Solo se admiten correos institucionales de la USAC.</small>
          <button className="button">{professorForm.id ? 'Actualizar' : 'Crear'} docente</button>
          <ul className="admin-list">
            {professors.map((value) => (
              <li key={value.id}>
                <span>
                  {value.full_name}
                  <small>{value.email}</small>
                </span>
                <button type="button" className="button alt" onClick={() => setProfessorForm({ ...value })}>
                  Editar
                </button>
                <button
                  type="button"
                  className="button alt"
                  onClick={() => void archive('/admin/professors', value.id)}
                >
                  Archivar
                </button>
              </li>
            ))}
          </ul>
        </EntityPanel>
      </section>

      <section className="admin-content single-column">
        <EntityPanel title="Asignaciones curso–docente" onSubmit={assign}>
          <select
            className="field"
            value={assignmentForm.course_id}
            onChange={(event) => setAssignmentForm({ ...assignmentForm, course_id: event.target.value })}
          >
            <option value="">Curso</option>
            {courses.map((value) => (
              <option key={value.id} value={value.id}>
                {value.code} · {value.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={assignmentForm.professor_id}
            onChange={(event) => setAssignmentForm({ ...assignmentForm, professor_id: event.target.value })}
          >
            <option value="">Docente</option>
            {professors.map((value) => (
              <option key={value.id} value={value.id}>
                {value.full_name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={assignmentForm.role_type}
            onChange={(event) => setAssignmentForm({ ...assignmentForm, role_type: event.target.value })}
          >
            <option value="professor">Catedrático</option>
            <option value="assistant">Auxiliar</option>
          </select>
          <button className="button">Asignar mediante SP</button>
          <ul className="admin-list">
            {staff.map((value) => (
              <li key={`${value.course_id}-${value.professor_id}`}>
                <span>
                  {value.course_code} · {value.professor_name}
                  <small>{value.role_type === 'assistant' ? 'Auxiliar' : 'Catedrático'}</small>
                </span>
                <button type="button" className="button alt" onClick={() => void revoke(value)}>
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        </EntityPanel>
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}

function EntityPanel({
  title,
  onSubmit,
  children,
}: {
  title: string;
  onSubmit: (event: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <article className="panel entity-panel">
      <h2>{title}</h2>
      <form onSubmit={onSubmit} className="role-form">
        {children}
      </form>
    </article>
  );
}
