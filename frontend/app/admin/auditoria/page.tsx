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

const periodDateFormatter = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatPeriodDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : periodDateFormatter.format(date);
}

export default function AuditPage() {
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<AnalyticsRecording[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [topRated, setTopRated] = useState<AnalyticsRecording[]>([]);
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [periodForm, setPeriodForm] = useState({ name: '', start_at: '', end_at: '' });
  const [toast, setToast] = useState<ToastState | null>(null);
  const maxTrendViews = Math.max(1, ...trends.map((item) => item.views));

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
          <div className="audit-section-heading">
            <div>
              <p className="section-label">SEÑALES DEL PERIODO ACTIVO</p>
              <h2>Temas en tendencia</h2>
            </div>
            <span className="audit-section-count">{trends.length} temas</span>
          </div>
          {trends.length ? (
            <div className="analytics-trend-grid">
              {trends.map((item, index) => (
                <article className="analytics-trend-card" key={item.topic}>
                  <span className="analytics-rank">{String(index + 1).padStart(2, '0')}</span>
                  <div className="analytics-trend-main">
                    <span className="section-label">Tema</span>
                    <strong>{item.topic}</strong>
                    <span className="analytics-trend-meter">
                      <span style={{ width: `${Math.round((item.views / maxTrendViews) * 100)}%` }} />
                    </span>
                  </div>
                  <div className="analytics-trend-count">
                    <strong>{item.views}</strong>
                    <span>{item.views === 1 ? 'reproducción' : 'reproducciones'}</span>
                  </div>
                </article>
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
      <section className="panel audit-period-panel">
        <div className="audit-section-heading">
          <div>
            <p className="section-label">CALENDARIO ACADÉMICO</p>
            <h2>Periodos de examen</h2>
          </div>
          <span className="audit-section-count">{periods.length} registrados</span>
        </div>
        <form className="period-form" onSubmit={savePeriod}>
          <label className="period-field">
            <span>Nombre del periodo</span>
            <input
              className="field"
              required
              placeholder="Ej. Exámenes agosto"
              value={periodForm.name}
              onChange={(event) => setPeriodForm({ ...periodForm, name: event.target.value })}
            />
          </label>
          <label className="period-field">
            <span>Inicio</span>
            <input
              className="field"
              required
              type="datetime-local"
              value={periodForm.start_at}
              onChange={(event) => setPeriodForm({ ...periodForm, start_at: event.target.value })}
            />
          </label>
          <label className="period-field">
            <span>Fin</span>
            <input
              className="field"
              required
              type="datetime-local"
              value={periodForm.end_at}
              onChange={(event) => setPeriodForm({ ...periodForm, end_at: event.target.value })}
            />
          </label>
          <button className="button" type="submit">
            Guardar periodo
          </button>
        </form>
        <div className="audit-period-list">
          {periods.map((period) => (
            <article className="audit-period-row" key={period.id}>
              <div className="audit-period-main">
                <div className="audit-period-title">
                  <strong>{period.name}</strong>
                  <span className={`badge ${period.active ? 'green' : 'gray'}`}>
                    {period.active ? 'Activo' : 'Programado'}
                  </span>
                </div>
                <div className="audit-period-dates">
                  <span>{formatPeriodDate(period.start_at)}</span>
                  <span aria-hidden="true">→</span>
                  <span>{formatPeriodDate(period.end_at)}</span>
                </div>
              </div>
              <button className="button alt" onClick={() => void removePeriod(period.id)}>
                Eliminar
              </button>
            </article>
          ))}
        </div>
      </section>
      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </AppShell>
  );
}
