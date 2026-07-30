// Persistencia — Analítica (MongoDB) · analytics_db

// Registro de cada visualización de una grabación.
db.createCollection("views");

// Conteo de temas en tendencia por período de examen.
db.createCollection("trends");

// Períodos de examen configurados por el administrador.
db.createCollection("exam_periods");
