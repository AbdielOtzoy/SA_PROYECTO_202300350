'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { api, errorMessage, request } from '../../components/api';
import { VideoPreview } from '../../components/VideoPreview';

type Recording = { id: string; title: string; course: string; semester: string; topic: string };
type HistoryItem = { recording_id: string; last_position_seconds: number; started_at: string };
type CatalogResponse = { recordings: Recording[] };
type HistoryResponse = { items: HistoryItem[] };
const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function History() {
  const [items, setItems] = useState<Recording[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([request<CatalogResponse>('/catalog'), request<HistoryResponse>('/history')])
      .then(([catalog, playbackHistory]) => {
        setItems(catalog.recordings);
        setHistory(playbackHistory.items);
      })
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, []);
  useEffect(() => {
    const missing = items.filter(
      (item) => history.some((entry) => entry.recording_id === item.id) && durations[item.id] === undefined,
    );
    missing.forEach((item) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = `${api}/playback/${item.id}/stream`;
      video.onloadedmetadata = () => setDurations((current) => ({ ...current, [item.id]: video.duration }));
      video.onerror = () => setDurations((current) => ({ ...current, [item.id]: 0 }));
      video.load();
    });
  }, [items, history, durations]);

  const recordings = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const recent = useMemo(
    () =>
      [
        ...new Map(
          history.filter((entry) => entry.last_position_seconds > 0).map((entry) => [entry.recording_id, entry]),
        ).values(),
      ]
        .map((entry) => ({ entry, recording: recordings.get(entry.recording_id) }))
        .filter((item): item is { entry: HistoryItem; recording: Recording } => !!item.recording),
    [history, recordings],
  );

  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">TU PROGRESO</p>
        <h1>Continuar viendo</h1>
        <p>Retoma tus videos recientes exactamente donde los dejaste.</p>
      </section>
      {error && <p className="notice">No se pudo cargar tu actividad. {error}</p>}
      {!error && !recent.length && (
        <article className="empty-history panel">
          <h2>Aún no tienes videos en progreso</h2>
          <p>Cuando reproduzcas una clase, aparecerá aquí con su avance.</p>
          <Link className="button" href="/catalogo">
            Explorar videos
          </Link>
        </article>
      )}
      <section className="history-list">
        {recent.map(({ entry, recording }) => {
          const duration = durations[recording.id] || 0;
          const position = Math.min(entry.last_position_seconds, duration || entry.last_position_seconds);
          const progress = duration ? Math.min(100, (position / duration) * 100) : 0;
          return (
            <article className="history-card panel" key={recording.id}>
              <VideoPreview recordingId={recording.id} className="history-thumb" />
              <div className="history-content">
                <span className="section-label">
                  {recording.course} · {recording.semester}
                </span>
                <h2>{recording.title}</h2>
                <p>
                  {recording.topic || 'Clase grabada'} · {format(position)} de {duration ? format(duration) : '—'}
                </p>
                <div className="progress-line">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
              <Link href={`/reproductor/${recording.id}`} className="button">
                Continuar
              </Link>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
