'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { errorMessage, request } from '../../components/api';
import { VideoPreview } from '../../components/VideoPreview';

type Recommendation = {
  id?: string;
  recording_id?: string;
  title: string;
  course: string;
  topic?: string;
  topics?: string[];
  recommendation: number;
  views?: number;
};
type RecommendationResponse = { items: Recommendation[] };

export default function Recommendations() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    request<RecommendationResponse>('/analytics/recommendations')
      .then((response) => setItems(response.items || []))
      .catch((cause: unknown) => setError(errorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">SELECCIÓN PERSONALIZADA</p>
        <h1>Recomendado para ti</h1>
        <p>Clases seleccionadas a partir de tus cursos, historial y valoraciones.</p>
      </section>

      {loading && (
        <section className="recommendations-feedback panel" role="status">
          <p>Cargando tus recomendaciones…</p>
        </section>
      )}

      {!loading && error && (
        <section className="recommendations-feedback panel" role="alert">
          <h2>No pudimos cargar tus recomendaciones</h2>
          <p>{error}</p>
          <button className="button" type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </section>
      )}

      {!loading && !error && items.length === 0 && (
        <section className="recommendations-feedback panel">
          <h2>Aún no tenemos recomendaciones</h2>
          <p>Explora algunas clases, registra tus valoraciones y vuelve a consultar esta sección.</p>
          <Link className="button" href="/catalogo">
            Explorar catálogo
          </Link>
        </section>
      )}

      {!loading && !error && items.length > 0 && (
        <section className="recommendations-page-grid" aria-label="Clases recomendadas">
          {items.slice(0, 10).map((recommendation) => {
            const recordingId = recommendation.recording_id || recommendation.id || '';
            return (
              <Link className="recording-card panel" key={recordingId} href={`/reproductor/${recordingId}`}>
                <VideoPreview recordingId={recordingId} className="recording-preview" />
                <span className="section-label">{recommendation.course || 'Curso recomendado'}</span>
                <h2>{recommendation.title}</h2>
                <div className="recording-meta">
                  <span>{recommendation.topics?.join(' · ') || recommendation.topic || 'Clase grabada'}</span>
                  <strong>{recommendation.recommendation}% recomendado</strong>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
