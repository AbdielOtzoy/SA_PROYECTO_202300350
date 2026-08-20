// Persistencia — Analítica (MongoDB) · analytics_db

// Registro de cada visualización de una grabación.
db.createCollection('views');
db.views.createIndex({ viewed_at: 1, recording_id: 1 });
db.views.createIndex({ recording_id: 1, viewed_at: 1 });

// Resultados materializados de tendencias por período de examen.
db.createCollection('trends');
db.trends.createIndex({ period_id: 1, topic: 1 });

// Períodos de examen configurados por el administrador.
db.createCollection('exam_periods');
db.exam_periods.createIndex({ start_at: 1, end_at: 1 });
