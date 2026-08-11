-- Práctica 3: rutas de video reproducibles para el entorno local.
--
-- El servicio playback monta ./videos en /videos y resuelve cada ruta por
-- nombre base. Por eso la base guarda sample*.mp4, no una ruta absoluta del
-- host ni nombres de archivos que no formen parte del volumen.
--
-- Es idempotente porque delega las escrituras en el procedimiento UPSERT de
-- grabaciones. Puede ejecutarse después de 03-practica3.sql y 04-practica3-seed.sql.

CALL sp_import_catalog_csv($json$
[
  {
    "school_code": "P3-EXTRA",
    "school_name": "Área de Pruebas Práctica 3",
    "course_code": "P3-IA",
    "course_name": "Introducción a la Automatización",
    "credits": 4,
    "semester_year": 2027,
    "semester_term": 1
  },
  {
    "school_code": "P3-EXTRA",
    "school_name": "Área de Pruebas Práctica 3",
    "course_code": "P3-UX",
    "course_name": "Experiencia de Usuario",
    "credits": 3,
    "semester_year": 2027,
    "semester_term": 1
  }
]$json$::jsonb);

CALL sp_import_recordings_csv($json$
[
  {
    "recording_id": "00000000-0000-0000-0000-000000000041",
    "title": "Automatización · Clase 01",
    "course_code": "P3-IA",
    "semester_year": 2027,
    "semester_term": 1,
    "lecture_date": "2027-01-20",
    "unit": "1",
    "topic": "Introducción a automatización",
    "video_path": "sample6.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000042",
    "title": "Automatización · Clase 02",
    "course_code": "P3-IA",
    "semester_year": 2027,
    "semester_term": 1,
    "lecture_date": "2027-01-27",
    "unit": "1",
    "topic": "Flujos de trabajo",
    "video_path": "sample7.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000043",
    "title": "Experiencia de Usuario · Clase 01",
    "course_code": "P3-UX",
    "semester_year": 2027,
    "semester_term": 1,
    "lecture_date": "2027-02-03",
    "unit": "1",
    "topic": "Principios de UX",
    "video_path": "sample8.mp4",
    "is_published": false,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": ""
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000061",
    "title": "Sample · Clase 06",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-13",
    "unit": "Unidad 5",
    "topic": "Video sample 06",
    "video_path": "sample6.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000062",
    "title": "Sample · Clase 07",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-14",
    "unit": "Unidad 5",
    "topic": "Video sample 07",
    "video_path": "sample7.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000063",
    "title": "Sample · Clase 08",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-15",
    "unit": "Unidad 5",
    "topic": "Video sample 08",
    "video_path": "sample8.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000064",
    "title": "Sample · Clase 09",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-16",
    "unit": "Unidad 6",
    "topic": "Video sample 09",
    "video_path": "sample9.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000065",
    "title": "Sample · Clase 10",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-17",
    "unit": "Unidad 6",
    "topic": "Video sample 10",
    "video_path": "sample10.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000066",
    "title": "Sample · Clase 11",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-18",
    "unit": "Unidad 6",
    "topic": "Video sample 11",
    "video_path": "sample11.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  },
  {
    "recording_id": "00000000-0000-0000-0000-000000000067",
    "title": "Sample · Clase 12",
    "course_code": "SA",
    "semester_year": 2026,
    "semester_term": 2,
    "lecture_date": "2026-08-19",
    "unit": "Unidad 6",
    "topic": "Video sample 12",
    "video_path": "sample12.mp4",
    "is_published": true,
    "professor_emails": "docente@ingenieria.usac.edu.gt",
    "assistant_emails": "auxiliar@ing.usac.edu.gt"
  }
]$json$::jsonb);
