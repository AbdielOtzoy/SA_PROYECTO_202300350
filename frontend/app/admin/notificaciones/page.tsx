'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../../components/api';
import { Toast, type ToastVariant } from '../../../components/Toast';

type Course = { id: string; code: string; name: string };
type ToastState = { message: string; variant: ToastVariant };

const roles = [
  { value: 'student', label: 'Estudiantes' },
  { value: 'teacher', label: 'Docentes' },
  { value: 'assistant', label: 'Auxiliares' },
  { value: 'admin', label: 'Administradores' },
];

export default function NotificationsAdminPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [targetType, setTargetType] = useState<'role' | 'course'>('role');
  const [targetValue, setTargetValue] = useState('student');
  const [subject, setSubject] = useState('Aviso académico');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((response) => setProfile(response.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  useEffect(() => {
    if (!profile?.roles.includes('admin')) return;
    request<{ courses: Course[] }>('/admin/courses')
      .then((response) => setCourses(response.courses || []))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, [profile]);

  function changeTargetType(value: 'role' | 'course') {
    setTargetType(value);
    setTargetValue(value === 'role' ? 'student' : courses[0]?.id || '');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    try {
      const response = await request<{ queued: number; recipients: number }>('/admin/notifications', {
        method: 'POST',
        body: JSON.stringify({ target_type: targetType, target_value: targetValue, subject, body }),
      });
      setToast({
        message: `Aviso encolado para ${response.recipients} destinatarios (${response.queued} correos activos).`,
        variant: 'success',
      });
      setBody('');
    } catch (cause: unknown) {
      setToast({ message: errorMessage(cause), variant: 'error' });
    } finally {
      setSending(false);
    }
  }

  if (!profile)
    return (
      <AppShell admin>
        <p className="notice">Validando permisos…</p>
      </AppShell>
    );
  if (!profile.roles.includes('admin'))
    return (
      <AppShell admin>
        <p className="notice">403 · Solo un administrador puede emitir avisos.</p>
      </AppShell>
    );

  return (
    <AppShell admin>
      <section className="page-heading">
        <p className="eyebrow">CENTRO DE CONTROL · COMUNICACIONES</p>
        <h1>Avisos administrativos</h1>
        <p>Envía comunicados por rol o curso respetando las preferencias de cada usuario.</p>
      </section>
      <form className="panel notification-form" onSubmit={submit}>
        <div className="form-grid-two">
          <div>
            <label className="form-label" htmlFor="target-type">
              Audiencia
            </label>
            <select
              id="target-type"
              className="field"
              value={targetType}
              onChange={(event) => changeTargetType(event.target.value as 'role' | 'course')}
            >
              <option value="role">Por rol</option>
              <option value="course">Por curso</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="target-value">
              Destino
            </label>
            {targetType === 'role' ? (
              <select
                id="target-value"
                className="field"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="target-value"
                className="field"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                required
              >
                <option value="">Selecciona un curso</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <label className="form-label" htmlFor="notice-subject">
          Asunto
        </label>
        <input
          id="notice-subject"
          className="field"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          maxLength={200}
          required
        />
        <label className="form-label" htmlFor="notice-body">
          Mensaje
        </label>
        <textarea
          id="notice-body"
          className="field textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={5000}
          rows={8}
          required
        />
        <button className="button" type="submit" disabled={sending || (targetType === 'course' && !targetValue)}>
          {sending ? 'Encolando aviso…' : 'Enviar aviso'}
        </button>
      </form>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
