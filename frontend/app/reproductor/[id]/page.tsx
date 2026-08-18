'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/AppShell';
import { api, errorMessage, request } from '../../../components/api';
import { Icon } from '../../../components/Icon';

type Participant = { id: string; full_name: string; email: string };
type Attachment = {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  attachment_type: string;
};
type Detail = {
  title: string;
  course: string;
  semester: string;
  unit?: string;
  topic: string;
  topics?: string[];
  lecture_date?: string;
  professors?: Participant[];
  assistants?: Participant[];
  attachments?: Attachment[];
  recommendation: number;
};
type PlaybackResponse = { checkpoint_seconds: number };
type RecordingResponse = { recording: Detail };
type RatingResponse = { recommendation: number };
type Vote = true | false;
const time = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const video = useRef<HTMLVideoElement>(null);
  const currentTimeRef = useRef(0);
  const lastSavedRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  const resumeAtRef = useRef<number | null>(null);
  const userSoughtRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [savedCheckpoint, setSavedCheckpoint] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rating, setRating] = useState<number>();
  const [vote, setVote] = useState<Vote>();
  const [voting, setVoting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const updatePosition = (seconds: number) => {
    const position = Math.max(0, Math.min(seconds, duration || seconds));
    currentTimeRef.current = position;
    setCurrentTime(position);
  };

  async function savePosition(seconds: number, event_type = 'checkpoint') {
    const position = Math.max(0, Math.min(seconds, duration || seconds));
    lastSavedRef.current = position;
    setSavedCheckpoint(position);
    try {
      await request(`/playback/${id}/checkpoint`, {
        method: 'PUT',
        body: JSON.stringify({ seconds: position, event_type }),
      });
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    }
  }

  async function submitVote(nextVote: Vote) {
    setVoting(true);
    setRatingError('');
    try {
      const response = await request<RatingResponse>(`/catalog/${id}/rating`, {
        method: 'PUT',
        body: JSON.stringify({ vote: nextVote }),
      });
      setVote(nextVote);
      setRating(response.recommendation);
    } catch (cause: unknown) {
      setRatingError(errorMessage(cause));
    } finally {
      setVoting(false);
    }
  }

  useEffect(() => {
    resumeAppliedRef.current = false;
    userSoughtRef.current = false;
    hasPlayedRef.current = false;
    currentTimeRef.current = 0;
    lastSavedRef.current = 0;
    setCurrentTime(0);
    setSavedCheckpoint(0);
    setResumeAt(null);
    resumeAtRef.current = null;
    setDuration(0);
    Promise.all([
      request<PlaybackResponse>(`/playback/${id}`, { method: 'POST' }),
      request<RecordingResponse>(`/catalog/${id}`),
    ])
      .then(([play, response]) => {
        const checkpoint = Number(play.checkpoint_seconds) || 0;
        resumeAtRef.current = checkpoint;
        setResumeAt(checkpoint);
        setSavedCheckpoint(checkpoint);
        lastSavedRef.current = checkpoint;
        setDetail(response.recording);
      })
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, [id]);

  const applyResumePosition = () => {
    const element = video.current;
    const checkpoint = resumeAtRef.current;
    if (
      !element ||
      !Number.isFinite(element.duration) ||
      !element.duration ||
      checkpoint === null ||
      resumeAppliedRef.current
    )
      return;
    const position = Math.min(checkpoint, element.duration);
    element.currentTime = position;
    resumeAppliedRef.current = true;
    updatePosition(position);
    if (position !== checkpoint) void savePosition(position, 'resume_clamped');
  };

  useEffect(() => {
    applyResumePosition();
  }, [duration, resumeAt]);

  function metadata() {
    const element = video.current;
    if (!element || !Number.isFinite(element.duration)) return;
    setDuration(element.duration);
    applyResumePosition();
  }

  async function togglePlayback() {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      try {
        // Some browsers reset currentTime while the streamed media finishes buffering.
        // Applying the saved point immediately before play makes resume deterministic.
        // Apply it here as well: a streamed <video> may reset currentTime to 0
        // after the metadata events, but it is stable when the user requests play.
        if (!userSoughtRef.current && resumeAtRef.current !== null && element.duration && element.currentTime === 0) {
          const position = Math.min(resumeAtRef.current, element.duration);
          element.currentTime = position;
          resumeAppliedRef.current = true;
          updatePosition(position);
        }
        await element.play();
      } catch (cause: unknown) {
        setError(errorMessage(cause));
      }
    } else {
      element.pause();
    }
  }

  function seek(seconds: number) {
    const element = video.current;
    const position = Math.max(0, Math.min(seconds, duration));
    // A deliberate seek takes precedence over the automatic resume point.
    userSoughtRef.current = true;
    resumeAppliedRef.current = true;
    updatePosition(position);
    if (element) element.currentTime = position;
  }

  function toggleMute() {
    const element = video.current;
    if (!element) return;
    element.muted = !element.muted;
    setIsMuted(element.muted);
  }

  async function toggleFullscreen() {
    const stage = video.current?.parentElement;
    if (!stage) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  }

  const title = detail?.title || 'Cargando grabación…';
  const course = detail?.course || '—';
  const position = Math.min(currentTime, duration || currentTime);
  const progress = duration ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <AppShell>
      <div className="breadcrumb">
        <span>Catálogo</span>
        <span>/</span>
        <span>{course}</span>
        <span>/</span>
        <span>{detail?.unit || 'Grabación'}</span>
      </div>
      <section className="page-heading player-heading">
        <h1>{title}</h1>
        <p>
          {course} · {detail?.semester || '—'} · {duration ? time(duration) : 'Cargando duración…'}
        </p>
      </section>
      {error ? (
        <p className="notice">{error}</p>
      ) : (
        <div className="player-layout">
          <div>
            <div className="video-stage">
              <video
                ref={video}
                src={`${api}/playback/${id}/stream`}
                preload="auto"
                onLoadedMetadata={metadata}
                onLoadedData={applyResumePosition}
                onCanPlay={applyResumePosition}
                onClick={togglePlayback}
                onPlay={(event) => {
                  const checkpoint = resumeAtRef.current;
                  if (!userSoughtRef.current && checkpoint !== null && event.currentTarget.currentTime < checkpoint) {
                    const position = Math.min(checkpoint, event.currentTarget.duration);
                    event.currentTarget.currentTime = position;
                    resumeAppliedRef.current = true;
                    updatePosition(position);
                  }
                  hasPlayedRef.current = true;
                  setIsPlaying(true);
                }}
                onPause={() => {
                  setIsPlaying(false);
                  if (hasPlayedRef.current) void savePosition(currentTimeRef.current, 'pause');
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  updatePosition(duration);
                  if (hasPlayedRef.current) void savePosition(duration, 'ended');
                }}
                onTimeUpdate={(event) => {
                  if (!hasPlayedRef.current) return;
                  const position = event.currentTarget.currentTime;
                  updatePosition(position);
                  if (position - lastSavedRef.current >= 5) void savePosition(position);
                }}
              />
              {!isPlaying && (
                <button className="video-placeholder" onClick={togglePlayback} aria-label="Reproducir clase">
                  <span className="play-ring">
                    <Icon name="play" size={48} />
                  </span>
                </button>
              )}
            </div>
            <div className="video-controls">
              <button
                className="player-control"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} />
              </button>
              <input
                className="player-timeline"
                aria-label="Avance del video"
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={position}
                disabled={!duration}
                style={{ background: `linear-gradient(90deg, var(--blue) ${progress}%, #466590 ${progress}%)` }}
                onPointerDown={() => {
                  userSoughtRef.current = true;
                }}
                onChange={(event) => {
                  const nextPosition = Number(event.target.value);
                  seek(nextPosition);
                  void savePosition(nextPosition, 'seek');
                }}
              />
              <span className="monospace">
                {time(position)} / {duration ? time(duration) : '--:--'}
              </span>
              <button
                className="player-control"
                onClick={toggleMute}
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                <Icon name="volume" />
              </button>
              <button className="player-control" onClick={() => void toggleFullscreen()} aria-label="Pantalla completa">
                <Icon name="expand" />
              </button>
            </div>
            <section className="player-info panel">
              <div>
                <h2>¿Recomendarías esta clase?</h2>
                <p>Tu valoración ayuda a otros estudiantes.</p>
              </div>
              <div className="rating-actions">
                <button
                  className={`button success ${vote === true ? 'selected' : ''}`}
                  onClick={() => void submitVote(true)}
                  disabled={voting}
                  aria-pressed={vote === true}
                >
                  <Icon name="thumbUp" />
                  Sí
                </button>
                <button
                  className={`button danger ${vote === false ? 'selected' : ''}`}
                  onClick={() => void submitVote(false)}
                  disabled={voting}
                  aria-pressed={vote === false}
                >
                  <Icon name="thumbDown" />
                  No
                </button>
              </div>
              {ratingError && <p className="rating-error">{ratingError}</p>}
            </section>
          </div>
          <aside className="player-side">
            <section className="checkpoint panel">
              <Icon name="check" size={30} />
              <h3>Checkpoint guardado</h3>
              <strong>{time(savedCheckpoint)}</strong>
              <p>Se guarda cada 5 segundos, al pausar y al cambiar de posición</p>
            </section>
            <section className="recording-detail">
              <h2>Ficha de grabación</h2>
              <dl className="detail-list">
                <div>
                  <dt>CURSO</dt>
                  <dd>{course}</dd>
                </div>
                <div>
                  <dt>TEMA</dt>
                  <dd>{detail?.topic || '—'}</dd>
                </div>
                <div>
                  <dt>SEMESTRE</dt>
                  <dd>{detail?.semester || '—'}</dd>
                </div>
                <div>
                  <dt>FECHA DE IMPARTICIÓN</dt>
                  <dd>{detail?.lecture_date || '—'}</dd>
                </div>
                <div>
                  <dt>TEMAS</dt>
                  <dd>{detail?.topics?.join(' · ') || detail?.topic || '—'}</dd>
                </div>
              </dl>
            </section>
            <section className="recording-detail">
              <h2>Participantes</h2>
              <div className="participant-group">
                <span className="section-label">DOCENTES</span>
                {detail?.professors?.length ? (
                  <ul className="participant-list">
                    {detail.professors.map((person) => (
                      <li key={person.id}>
                        <strong>{person.full_name}</strong>
                        <span>{person.email}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No hay docentes registrados.</p>
                )}
              </div>
              <div className="participant-group">
                <span className="section-label">AUXILIARES</span>
                {detail?.assistants?.length ? (
                  <ul className="participant-list">
                    {detail.assistants.map((person) => (
                      <li key={person.id}>
                        <strong>{person.full_name}</strong>
                        <span>{person.email}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No hay auxiliares registrados.</p>
                )}
              </div>
            </section>
            <section className="recording-detail">
              <h2>Sílabo y materiales</h2>
              {detail?.attachments?.length ? (
                <ul className="attachment-list">
                  {detail.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a href={attachment.file_path} target="_blank" rel="noreferrer">
                        <strong>{attachment.filename}</strong>
                        <span>{attachment.attachment_type === 'syllabus' ? 'Sílabo' : 'Material de apoyo'}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Esta grabación no tiene materiales adjuntos.</p>
              )}
            </section>
            <section className="recommendation">
              <span className="section-label">RECOMENDACIÓN</span>
              <strong>{rating ?? detail?.recommendation ?? 0}%</strong>
              <span>Valoración acumulada</span>
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
