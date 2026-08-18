'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { api, errorMessage, request } from '../../components/api';
import { Icon } from '../../components/Icon';
import { VideoPreview } from '../../components/VideoPreview';

type Recording = {
  id: string;
  title: string;
  course: string;
  course_code: string;
  school: string;
  semester: string;
  topic: string;
  topics?: string[];
  professor?: string;
  recommendation: number;
};
type Recommendation = Recording & { id?: string; recording_id?: string; views?: number };
type Trend = { topic: string; views: number; recording_ids: string[] };
type HistoryItem = { recording_id: string; last_position_seconds: number };
type CatalogResponse = {
  recordings: Recording[];
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
};
type OptionResponse = {
  schools: { schools: { id: string; name: string; code: string }[] };
  courses: { courses: { id: string; name: string; code: string }[] };
  semesters: { semesters: { id: string; year: number; term: number }[] };
  professors: { professors: { id: string; full_name: string; email: string }[] };
  topics: { topics: { id: string; name: string }[] };
};
type HistoryResponse = { items: HistoryItem[] };
type RecommendationResponse = { items: Recommendation[] };
type TrendResponse = { items: Trend[] };

const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function Catalog() {
  const [items, setItems] = useState<Recording[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [professor, setProfessor] = useState('');
  const [topic, setTopic] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<OptionResponse | null>(null);
  const [error, setError] = useState('');

  async function load(
    nextPage = 1,
    overrides: Partial<Record<'q' | 'school' | 'course' | 'semester' | 'professor' | 'topic', string>> = {},
  ) {
    const filters = { q, school, course, semester, professor, topic, ...overrides };
    try {
      setError('');
      const params = new URLSearchParams({ page: String(nextPage), page_size: '10' });
      Object.entries(filters).forEach(([key, value]) => value.trim() && params.set(key, value.trim()));
      const [catalog, playbackHistory] = await Promise.all([
        request<CatalogResponse>(`/catalog?${params}`),
        request<HistoryResponse>('/history'),
      ]);
      const [recommendationResult, trendResult] = await Promise.allSettled([
        request<RecommendationResponse>('/analytics/recommendations'),
        request<TrendResponse>('/analytics/trends/active'),
      ]);
      if (recommendationResult.status === 'fulfilled') setRecommendations(recommendationResult.value.items || []);
      if (trendResult.status === 'fulfilled') setTrends(trendResult.value.items || []);
      setItems(catalog.recordings || []);
      setHistory(playbackHistory.items || []);
      setPage(catalog.page || nextPage);
      setTotalPages(catalog.total_pages || 0);
      setTotal(catalog.total || 0);
    } catch (cause: unknown) {
      setError(`Inicia sesión para consultar los videos. ${errorMessage(cause)}`);
    }
  }

  useEffect(() => {
    void Promise.all([request<OptionResponse>('/catalog/options').then(setOptions), load(1)]).catch(() => undefined);
  }, []);

  useEffect(() => {
    const missing = items.filter((item) => durations[item.id] === undefined);
    missing.forEach((item) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = `${api}/playback/${item.id}/stream`;
      video.onloadedmetadata = () => setDurations((current) => ({ ...current, [item.id]: video.duration }));
      video.onerror = () => setDurations((current) => ({ ...current, [item.id]: 0 }));
      video.load();
    });
  }, [items, durations]);

  const recent = history.find(
    (entry) => entry.last_position_seconds > 0 && items.some((item) => item.id === entry.recording_id),
  );
  const continuing = recent && items.find((item) => item.id === recent.recording_id);
  const duration = continuing ? durations[continuing.id] || 0 : 0;
  const progress = duration && recent ? Math.min(100, (recent.last_position_seconds / duration) * 100) : 0;

  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">BIBLIOTECA DE VIDEOS</p>
        <h1>Explora tus videos</h1>
        <p>Encuentra grabaciones para repasar, practicar y avanzar.</p>
      </section>
      <div className="catalog-controls">
        <div className="catalog-search">
          <Icon name="search" />
          <input
            placeholder="Busca por curso o tema..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void load(1)}
          />
          <button className="button" onClick={() => void load(1)}>
            Buscar
          </button>
        </div>
        <div className="filter-row">
          <select
            className="field"
            value={semester}
            onChange={(event) => {
              setSemester(event.target.value);
              void load(1, { semester: event.target.value });
            }}
          >
            <option value="">Todos los semestres</option>
            {options?.semesters.semesters.map((value) => (
              <option key={value.id} value={`${value.year}-${value.term}`}>
                {value.year} · {value.term}° semestre
              </option>
            ))}
          </select>
          <select
            className="field"
            value={school}
            onChange={(event) => {
              setSchool(event.target.value);
              void load(1, { school: event.target.value });
            }}
          >
            <option value="">Todas las escuelas</option>
            {options?.schools.schools.map((value) => (
              <option key={value.id} value={value.name}>
                {value.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={course}
            onChange={(event) => {
              setCourse(event.target.value);
              void load(1, { course: event.target.value });
            }}
          >
            <option value="">Todos los cursos</option>
            {options?.courses.courses.map((value) => (
              <option key={value.id} value={value.code}>
                {value.code} · {value.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={professor}
            onChange={(event) => {
              setProfessor(event.target.value);
              void load(1, { professor: event.target.value });
            }}
          >
            <option value="">Todos los docentes</option>
            {options?.professors.professors.map((value) => (
              <option key={value.id} value={value.full_name}>
                {value.full_name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              void load(1, { topic: event.target.value });
            }}
          >
            <option value="">Todos los temas</option>
            {options?.topics.topics.map((value) => (
              <option key={value.id} value={value.name}>
                {value.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="notice">{error}</p>}
      {trends.length > 0 && (
        <section className="panel catalog-insights">
          <div className="catalog-section-head">
            <h2>Temas en tendencia</h2>
            <span>Durante el periodo de examen activo</span>
          </div>
          <div className="filter-row">
            {trends.map((trend) => (
              <span className="badge" key={trend.topic}>
                {trend.topic} · {trend.views}
              </span>
            ))}
          </div>
        </section>
      )}
      {recommendations.length > 0 && (
        <section className="catalog-insights">
          <div className="catalog-section-head">
            <h2>Recomendado para ti</h2>
            <span>Basado en tus cursos, historial y valoraciones</span>
          </div>
          <div className="recordings-grid">
            {recommendations.slice(0, 10).map((recommendation) => {
              const recordingId = recommendation.recording_id || recommendation.id || '';
              return (
                <Link className="recording-card panel" key={recordingId} href={`/reproductor/${recordingId}`}>
                  <VideoPreview recordingId={recordingId} className="recording-preview" />
                  <h3>{recommendation.title}</h3>
                  <span className="course-link">{recommendation.course}</span>
                  <div className="recording-meta">
                    <span>{recommendation.topic || 'Clase grabada'}</span>
                    <span>{recommendation.recommendation}% recomendado</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section>
        <div className="catalog-section-head">
          <h2>Todos los videos</h2>
          <span>
            {items.length} de {total} resultados · máximo 10 por página
          </span>
        </div>
        <div className="recordings-grid">
          {items.map((recording) => (
            <Link className="recording-card panel" key={recording.id} href={`/reproductor/${recording.id}`}>
              <VideoPreview recordingId={recording.id} className="recording-preview" />
              <h3>{recording.title}</h3>
              <span className="course-link">{recording.course}</span>
              <div className="recording-meta">
                <span>
                  {recording.topics?.join(' · ') || recording.professor || recording.topic || 'Clase grabada'}
                </span>
                <span>{durations[recording.id] ? format(durations[recording.id]) : '—'}</span>
              </div>
            </Link>
          ))}
        </div>
        {!items.length && !error && <p className="muted">No encontramos videos con esos filtros.</p>}
        {totalPages > 0 && (
          <nav className="pagination" aria-label="Paginación del catálogo">
            <button className="button alt" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
              <button key={value} className={`button ${value === page ? '' : 'alt'}`} onClick={() => void load(value)}>
                {value}
              </button>
            ))}
            <button className="button alt" disabled={page >= totalPages} onClick={() => void load(page + 1)}>
              Siguiente
            </button>
          </nav>
        )}
      </section>
      {continuing && recent && (
        <section className="continue-section">
          <div className="catalog-section-head">
            <h2>Continúa viendo</h2>
            <Link href="/historial">Ver todo →</Link>
          </div>
          <div className="continue-card panel">
            <VideoPreview recordingId={continuing.id} className="continue-thumb" />
            <div className="continue-content">
              <h3>{continuing.title}</h3>
              <p>
                {continuing.course} ·{' '}
                {format(Math.min(recent.last_position_seconds, duration || recent.last_position_seconds))} de{' '}
                {duration ? format(duration) : '—'}
              </p>
              <div className="progress-line">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
            <Link href={`/reproductor/${continuing.id}`} className="button">
              Continuar
            </Link>
          </div>
        </section>
      )}
    </AppShell>
  );
}
