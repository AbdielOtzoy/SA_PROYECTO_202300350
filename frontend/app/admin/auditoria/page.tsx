'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../../components/AppShell';
import { errorMessage, request, type SessionResponse, type SessionUser } from '../../../components/api';
import { Toast, type ToastVariant } from '../../../components/Toast';

type AnalyticsRecording = {
  recording_id: string;
  title: string;
  course: string;
  topic: string;
  recommendation: number;
  total_votes: number;
  views: number;
};
type Trend = { topic: string; views: number; recording_ids: string[] };
type ExamPeriod = { id: string; name: string; start_at: string; end_at: string; active: boolean };
type ToastState = { message: string; variant: ToastVariant };

export default function AuditPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<AnalyticsRecording[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [topRated, setTopRated] = useState<AnalyticsRecording[]>([]);
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [periodForm, setPeriodForm] = useState({ name: '', start_at: '', end_at: '' });
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    request<SessionResponse>('/session')
      .then((data) => setProfile(data.user))
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, []);

  useEffect(() => {
    if (!profile?.roles.includes('admin')) return;
    Promise.all([
      request<{ items: AnalyticsRecording[] }>('/admin/analytics/most-viewed'),
      request<{ items: Trend[] }>('/admin/analytics/trends'),
      request<{ items: AnalyticsRecording[] }>('/admin/analytics/top-rated'),
      request<{ items: ExamPeriod[] }>('/admin/analytics/exam-periods'),
    ])
      .then(([mostViewed, trendResponse, rated, periodResponse]) => {
        setItems(mostViewed.items || []);
        setTrends(trendResponse.items || []);
        setTopRated(rated.items || []);
        setPeriods(periodResponse.items || []);
      })
      .catch((cause: unknown) => setToast({ message: errorMessage(cause), variant: 'error' }));
  }, [profile]);

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await request<{ period: ExamPeriod }>('/admin/analytics/exam-periods', {
        method: 'POST',
        body: JSON.stringify(periodForm),
      });
      setPeriods((current) => [response.period, ...current]);
      setPeriodForm({ name: '', start_at: '', end_at: '' });
      setToast({ message: 'Periodo de examen guardado.', variant: 'success' });
    } catch (cause: unknown) {
      setToast({ message: errorMessage(cause), variant: 'error' });
    }
  }

  async function removePeriod(id: string) {
    try {
      await request(`/admin/analytics/exam-periods/${id}`, { method: 'DELETE' });
      setPeriods((current) => current.filter((period) => period.id !== id));
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
                <span>{item.title || item.recording_id}</span>
                <b>{item.views} reproducciones</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Aún no hay actividad agregada para mostrar.</p>
        )}
      </section>
      <section className="admin-content-grid">
        <div className="panel">
          <h2>Temas en tendencia</h2>
          {trends.length ? (
            <div className="audit-list">
              {trends.map((item) => (
                <div className="audit-row" key={item.topic}>
                  <span>{item.topic}</span>
                  <b>{item.views} reproducciones</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No hay tendencias para el periodo activo.</p>
          )}
        </div>
        <div className="panel">
          <h2>Ranking mejor valorado</h2>
          {topRated.length ? (
            <div className="audit-list">
              {topRated.map((item, index) => (
                <div className="audit-row" key={item.recording_id}>
                  <strong>#{index + 1}</strong>
                  <span>{item.title || item.recording_id}</span>
                  <b>
                    {item.recommendation}% · {item.total_votes} votos
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Aún no hay grabaciones valoradas.</p>
          )}
        </div>
      </section>
      <section className="panel">
        <h2>Periodos de examen</h2>
        <form className="filter-row" onSubmit={savePeriod}>
          <input
            className="field"
            required
            placeholder="Nombre"
            value={periodForm.name}
            onChange={(event) => setPeriodForm({ ...periodForm, name: event.target.value })}
          />
          <input
            className="field"
            required
            type="datetime-local"
            value={periodForm.start_at}
            onChange={(event) => setPeriodForm({ ...periodForm, start_at: event.target.value })}
          />
          <input
            className="field"
            required
            type="datetime-local"
            value={periodForm.end_at}
            onChange={(event) => setPeriodForm({ ...periodForm, end_at: event.target.value })}
          />
          <button className="button" type="submit">
            Guardar periodo
          </button>
        </form>
        <div className="audit-list">
          {periods.map((period) => (
            <div className="audit-row" key={period.id}>
              <span>
                {period.name} · {period.active ? 'activo' : 'programado'}
              </span>
              <small>
                {period.start_at} → {period.end_at}
              </small>
              <button className="button alt" onClick={() => void removePeriod(period.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
