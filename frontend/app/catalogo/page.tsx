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
  recommendation: number;
};
type HistoryItem = { recording_id: string; last_position_seconds: number };
type CatalogResponse = { recordings: Recording[] };
type HistoryResponse = { items: HistoryItem[] };
const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function Catalog() {
  const [items, setItems] = useState<Recording[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  async function load(query = q) {
    try {
      setError('');
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const [catalog, playbackHistory] = await Promise.all([
        request<CatalogResponse>(`/catalog?${params}`),
        request<HistoryResponse>('/history'),
      ]);
      setItems(catalog.recordings);
      setHistory(playbackHistory.items);
    } catch (cause: unknown) {
      setError(`Inicia sesión para consultar los videos. ${errorMessage(cause)}`);
    }
  }

  useEffect(() => {
    void load();
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
            onKeyDown={(event) => event.key === 'Enter' && void load()}
          />
          <button className="button" onClick={() => void load()}>
            Buscar
          </button>
        </div>
      </div>
      {error && <p className="notice">{error}</p>}
      <section>
        <div className="catalog-section-head">
          <h2>Todos los videos</h2>
          <span>{items.length} resultados</span>
        </div>
        <div className="recordings-grid">
          {items.map((recording) => (
            <Link className="recording-card panel" key={recording.id} href={`/reproductor/${recording.id}`}>
              <VideoPreview recordingId={recording.id} className="recording-preview" />
              <h3>{recording.title}</h3>
              <span className="course-link">{recording.course}</span>
              <div className="recording-meta">
                <span>{recording.topic || 'Clase grabada'}</span>
                <span>{durations[recording.id] ? format(durations[recording.id]) : '—'}</span>
              </div>
            </Link>
          ))}
        </div>
        {!items.length && !error && <p className="muted">No encontramos videos con esos filtros.</p>}
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
