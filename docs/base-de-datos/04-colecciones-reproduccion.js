// Colecciones — Reproducción (MongoDB) · playback_db

// Almacena la posición exacta de reproducción por usuario y grabación.
db.createCollection('checkpoints');
db.checkpoints.createIndex({ user_id: 1, recording_id: 1 }, { unique: true, name: 'checkpoints_user_recording_uidx' });

// Mantiene el último avance por usuario y grabación.
db.createCollection('playback_history');
db.playback_history.createIndex({ user_id: 1, started_at: -1 }, { name: 'playback_history_user_started_idx' });

// Registro detallado de eventos de interacción durante la reproducción.
db.createCollection('playback_events');
db.playback_events.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000, name: 'playback_events_timestamp_ttl' },
);
