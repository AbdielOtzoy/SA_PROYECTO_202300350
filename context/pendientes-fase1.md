# Pendientes para completar Proyecto Fase 1

## YoUSAC — Revisión del estado actual

**Fecha de revisión:** 16 de agosto de 2026  
**Repositorio:** `SA_PROYECTO_202300350`  
**Objetivo:** documentar lo que falta completar antes de entregar la Fase 1 definida en [`proyecto1.md`](proyecto1.md).

## 1. Dictamen general

El núcleo desarrollado en las Prácticas 1, 2 y 3 está integrado en el proyecto: arquitectura políglota, comunicación gRPC, autenticación institucional, reproducción, checkpoints, panel administrativo, importación CSV, Stored Procedures y paginación.

P1 —despliegue en GCP y almacenamiento GCS— y P2–P5 quedaron implementadas y validadas. La Fase 1 todavía requiere sincronizar la documentación con el código real, crear el informe técnico de fase, cerrar la limitación documentada de sesión según aceptación del docente y completar la integración final mediante Pull Request y tag. CI/CD queda fuera del alcance de esta fase por confirmación docente.

## 2. Estado verificado

### Completado o parcialmente completado

- Backend en TypeScript, Go y Python.
- Contratos `.proto` y comunicación interna mediante gRPC.
- API Gateway como punto de entrada externo.
- Registro e inicio de sesión con dominios institucionales.
- JWT y cookies de sesión `HttpOnly` y `Secure`.
- OAuth institucional implementado en el Gateway.
- Roles `student`, `teacher`, `assistant` y `admin`.
- CRUD de escuelas, cursos, semestres y docentes.
- Asignación y revocación de docentes mediante Stored Procedures.
- Importación CSV de catálogo, grabaciones e inscripciones.
- Paginación del catálogo desde PostgreSQL, limitada a 10 registros.
- Filtros de catálogo por búsqueda, escuela, curso, semestre y docente.
- Streaming local, checkpoints, historial y valoración binaria.
- Documentación base de requisitos, casos de uso, arquitectura, modelo de datos y mockups.
- Seis mockups de la interfaz y archivos fuente editables de los diagramas.
- Tags existentes `0.1.0` y `0.2.0`.
- `npm run verify` pasa formato, lint, typecheck, pruebas unitarias y pruebas de contratos.
- `docker-compose.local.yml` tiene una configuración sintácticamente válida.
- P2 —microservicio de Analítica— completado y verificado con pruebas Python, Gateway y Docker.
- P3 —panel de cursos e inscripciones— completado y verificado con pruebas de Gateway, Identidad, frontend y Docker.

### Verificación de P2 completada

No quedan verificaciones pendientes para P2. El entorno local se reconstruyó y levantó con Docker Compose; se validaron autenticación, autorización, catálogo cacheado, registro de vistas, periodos de examen, tendencias, ranking, recomendaciones, TTL de Redis e índices de MongoDB. La suite `npm run verify`, la verificación de contratos y `docker compose config` finalizaron correctamente.

## 3. Estado de pendientes

### P1 — Despliegue funcional en GCP y almacenamiento GCS: completado ✅

El proyecto exige una aplicación funcional en Google Cloud Platform y videos almacenados en Google Cloud Storage.

Implementación y validación realizada:

- [`docker-compose.gcp.yml`](../docker-compose.gcp.yml) es una composición cloud independiente con todos los servicios, persistencia, TLS configurable y sin volumen local de videos.
- [`services/playback/cmd/playback/main.go`](../services/playback/cmd/playback/main.go) permite seleccionar `VIDEO_STORAGE_MODE=local` o `VIDEO_STORAGE_MODE=gcs`.
- [`services/playback/internal/storage/storage.go`](../services/playback/internal/storage/storage.go) implementa lectura streaming desde GCS mediante Application Default Credentials, con soporte opcional para `GCS_PREFIX`.
- La lectura real de `gs://yousac-videos-yousac/sample6.mp4` fue validada con ADC.
- La composición fue desplegada en la VM de GCP y la validación funcional reportada confirmó el funcionamiento de la aplicación, la autenticación, el catálogo, la reproducción, los checkpoints y las consultas de Redis.
- Mailpit permanece disponible para validar los correos generados por la plataforma.

Evidencia de entrega por adjuntar al informe final:

- URL o dominio público de la aplicación.
- Capturas o registro de login, catálogo, reproducción desde GCS, checkpoint, Redis y Mailpit.

La implementación y las guías se encuentran en [`docs/implementacion-gcs.md`](../docs/implementacion-gcs.md) y [`docs/despliegue-gcp.md`](../docs/despliegue-gcp.md).

### P2 — Microservicio de analítica: completado ✅

Se completó el alcance P2 definido en [`proyecto1.md`](proyecto1.md):

- Contratos gRPC para catálogo cacheado, más vistas, tendencias, ranking, periodos, recomendaciones e invalidación.
- Agregación semanal con rango `[inicio, fin)`, enriquecida con metadatos y señales de Catálogo.
- Tendencias normalizadas por `topic` durante periodos de examen administrados.
- Ranking por porcentaje positivo, total de votos y título, excluyendo grabaciones sin votos.
- Recomendaciones deterministas por cursos inscritos, historial, temas, votos y porcentaje global.
- MongoDB para `views`, `exam_periods` y `trends`, con índices de fechas y grabaciones.
- Redis con TTL de 900 segundos para catálogo y 300 segundos para resultados analíticos.
- Consultas gRPC de Analítica hacia Catálogo, Identidad y Reproducción, con nueva validación del JWT.
- Endpoints administrativos y autenticados en Gateway, panel de auditoría y módulos de catálogo.
- Pruebas de dominio, caché, validación de periodos, recomendaciones y propagación de JWT.

La evidencia técnica se encuentra en [`docs/implementacion-v0.2.0.md`](../docs/implementacion-v0.2.0.md) y [`docs/arquitectura/modelo-4-1.md`](../docs/arquitectura/modelo-4-1.md). El build y arranque real de Docker fueron ejecutados correctamente el 16 de agosto de 2026; las cachés de catálogo y analítica observaron TTL dentro de los límites de 900 y 300 segundos, respectivamente.

### P3 — Panel de cursos e inscripciones: completado ✅

Se completó RF-008 y CU-01.10 de extremo a extremo:

- `ListEnrollments` aplica filtros por semestre, estado y credenciales académicas.
- `GET /api/enrollments` valida sesión y restringe el acceso a estudiantes y administradores.
- Los estudiantes solo consultan sus propias inscripciones; el administrador puede consultar otra cuenta mediante `user_id`.
- El Gateway consulta Catálogo por gRPC para enriquecer cursos y semestres con código, nombre, créditos y período académico.
- [`frontend/app/cursos/page.tsx`](../frontend/app/cursos/page.tsx) muestra tarjetas responsivas, filtros, estados de carga, errores, reintento y lista vacía.
- La navegación oculta “Mis cursos” para docentes y auxiliares.
- Las pruebas cubren filtros, permisos, propagación del JWT, enriquecimiento y referencias académicas inexistentes.

La validación unitaria y funcional de P3 quedó completada. `npm run verify`, la configuración de Compose, el build de las imágenes y el arranque real con Docker finalizaron correctamente. Se verificaron login, consulta propia, filtros combinados por semestre/estado/credenciales, enriquecimiento desde Catálogo, acceso administrativo a otra cuenta, rechazo de estudiantes sobre otra cuenta y rechazo de docentes/auxiliares.

### P4 — Completar notificaciones y recuperación de acceso ✅

P4 quedó implementada de extremo a extremo para RF-003, RF-004, RF-005, RF-027–RF-029 y RNF-006:

- Recuperación mediante enlace único, token aleatorio almacenado como hash SHA-256, expiración de 30 minutos, invalidación posterior al uso y respuesta no enumerativa.
- Correos de registro, recuperación y seguridad encolados en PostgreSQL y entregados por el worker a Mailpit/SMTP.
- Preferencias editables para `new_recording` y `admin_notice`; `recovery` y `security` permanecen obligatorias.
- Detección de transiciones `is_published=false` a `true`, resolución de inscritos por gRPC y fanout filtrado por preferencias.
- Avisos administrativos por rol o curso, con autorización exclusiva para `admin` y pantalla [`frontend/app/admin/notificaciones/page.tsx`](../frontend/app/admin/notificaciones/page.tsx).
- Worker con lotes, `FOR UPDATE SKIP LOCKED`, estados `pending/processing/sent/failed`, reintentos y garantía documentada de entrega normal en cinco minutos.
- La pantalla de login enlaza a [`frontend/app/recuperar/page.tsx`](../frontend/app/recuperar/page.tsx), y Configuración permite administrar las preferencias.

Validación de cierre realizada:

- `npm run verify` y `npm run test:contracts`: completados correctamente.
- `docker compose --env-file .env -f docker-compose.local.yml config`: válido.
- `docker compose --env-file .env -f docker-compose.local.yml up --build -d`: todas las imágenes construidas y servicios estables.
- Mailpit: registro, recuperación y seguridad recibidos; el token se rechazó al reutilizarlo.
- Preferencias: un aviso por rol encontró 6 destinatarios y encoló 5 al excluir la cuenta deshabilitada; un aviso por curso encoló 3.
- Publicación: 7 grabaciones cambiaron a publicadas, se generaron avisos para inscritos y la cola terminó con todos los registros en `sent`.
- Navegador: `/recuperar` mostró los estados de solicitud y restablecimiento; el login enlaza a `/recuperar`.

### P5 — Ficha detallada y modelo académico ✅

P5 quedó implementada de extremo a extremo dentro del microservicio de Catálogo, sin carga binaria ni integración con GCS.

Implementado:

- Migración idempotente `databases/catalog/06-p5.sql` con `topics`, `recording_topics` y `attachments`, índices, vistas y procedimiento de importación actualizado.
- Compatibilidad con el CSV anterior y columnas opcionales `topics` (separada por `;`) y `attachments_json`, con normalización, validación y reemplazo transaccional de relaciones.
- Contrato gRPC con `ListTopics`, filtro `topic`, temas, docentes, auxiliares y adjuntos; Analítica conserva la propagación del filtro y los temas.
- Ficha REST estable en `GET /api/catalog/:id`, filtro `GET /api/catalog?topic=...` y etiquetas en `GET /api/catalog/options`.
- Interfaz de `/catalogo` con filtro por tema y de `/reproductor/[id]` con curso, semestre, unidad, fecha ISO, temas, participantes separados y materiales/sílabo, incluyendo estados vacíos.
- Documentación actualizada en arquitectura, requerimientos, casos de uso, modelo de datos y [`docs/implementacion-p5.md`](../docs/implementacion-p5.md).

Validación de cierre realizada:

- `npm run verify`: completado correctamente; incluye formato, lint, typecheck, pruebas Node, Go, Python y contratos.
- `docker compose --env-file .env -f docker-compose.local.yml config`: válido.
- `docker compose --env-file .env -f docker-compose.local.yml up --build -d`: imágenes construidas y servicios estables.
- Flujo funcional autenticado: importación de CSV P5, consulta de temas en opciones, filtrado por `Microservicios` y ficha con tres temas, docente, auxiliar, sílabo/material y `lecture_date` en formato `2026-08-18`.
- Navegador: se verificaron las rutas y controles de filtro de temas, ficha, participantes separados y sección de materiales; la respuesta funcional de datos se confirmó contra el Gateway autenticado.

Fuera de alcance de P5: carga binaria, Google Cloud Storage, GCP, CRUD administrativo de temas/materiales y los pendientes posteriores P8–P10.

## 4. Pendientes de infraestructura y calidad

### P6 — CI/CD: fuera del alcance de Fase 1

Según la consulta realizada al docente, CI/CD no es un requisito para esta fase. Por ese motivo no se implementará un pipeline en P1 y su ausencia no bloquea la entrega.

La construcción y el despliegue actuales se realizan mediante Docker Compose en la VM de GCP. CI/CD podrá incorporarse en una fase posterior si se solicita.

### P7 — Dockerfiles y Compose: aceptado para Fase 1 ✅

Existen Dockerfiles para frontend, Gateway y los microservicios. PostgreSQL, MongoDB y Redis se consumen directamente mediante imágenes oficiales.

Se confirmó que las imágenes oficiales de PostgreSQL, MongoDB y Redis son aceptadas para la Fase 1; no es necesario crear Dockerfiles auxiliares para estas dependencias.

`docker-compose.gcp.yml` es el archivo independiente utilizado para la VM. `docker-compose.cloud.yml` se conserva como override parcial para escenarios compatibles con el entorno local.

### P8 — Revisar seguridad de sesión

La sesión utiliza un JWT con expiración fija de 60 minutos. La documentación de decisiones indica expiración después de 60 minutos de inactividad.

Se debe implementar una estrategia de expiración por inactividad o documentar explícitamente la limitación y confirmar que sea aceptada.

## 5. Pendientes de documentación

### P9 — Sincronizar el modelo de datos con el código

[`docs/base-de-datos/modelo-entidad-relacion.md`](../docs/base-de-datos/modelo-entidad-relacion.md) documenta objetos que no coinciden con los scripts reales.

Ejemplos que deben corregirse o implementarse:

- `topics`, `recording_topics` y `attachments` ya fueron implementados en el modelo y migración de Catálogo durante P5; el resto de inconsistencias de este apartado permanece pendiente.
- Se documentan `sp_assign_role` y `sp_revoke_role`, pero el código utiliza `set_user_role`.
- Se documenta `trg_audit_credentials`, pero el trigger real audita `user_roles`.
- Se documentan `vw_user_profile` y `vw_catalog`, pero los nombres reales son diferentes.
- Se documentan `sp_enqueue_notification`, `vw_queue_status` y un worker de correo que no existen en la base real.

La documentación debe reflejar exclusivamente lo implementado y probado antes de la entrega.

### P10 — Crear un documento técnico específico de la Fase 1

Los informes actuales corresponden principalmente a Práctica 1, implementación `v0.2.0` y Práctica 3. Antes de entregar conviene crear o actualizar un documento que reúna:

- Introducción y alcance de la Fase 1.
- Requerimientos y trazabilidad.
- Arquitectura 4+1 actualizada.
- Modelo de datos real.
- Funcionalidades implementadas.
- Evidencia local y cloud.
- Pruebas realizadas y resultados.
- Limitaciones conocidas.
- Conclusiones.

## 6. Pendientes de integración y entrega

La rama actual es `feature/fase1`. La integración y el Pull Request final todavía no se han realizado.

Falta:

- Crear Pull Request de la rama de Práctica 3 hacia `develop`.
- Integrar `develop` hacia `main` mediante Pull Request aprobado.
- Crear el tag `0.3.0` para la práctica 3, si todavía se requiere como evidencia independiente.
- Crear el tag `1.0.0` para la entrega de la Fase 1.
- Agregar los enlaces o capturas de los Pull Requests aprobados.
- Confirmar que el commit etiquetado corresponde al estado realmente probado.

## 7. Orden recomendado para cerrar la entrega

1. Implementar y probar GCP, GCS y la topología cloud completa.
2. Completar recuperación de acceso y mantener evidencia de las inscripciones ya implementadas.
3. Completar notificaciones, preferencias y avisos automáticos.
4. Completar la ficha detallada y decidir el modelo de temas/materiales.
5. Actualizar los scripts y la documentación del modelo de datos.
6. Documentar que CI/CD queda fuera de Fase 1 según la confirmación docente.
7. Levantar el entorno local con Docker y repetir las pruebas funcionales de todos los servicios.
8. Capturar evidencia de cada requisito obligatorio.
9. Integrar mediante Pull Requests y crear el tag `1.0.0`.

## 8. Criterio final de listo para entregar

La Fase 1 podrá considerarse lista cuando se cumplan simultáneamente estas condiciones:

- La aplicación sea accesible y funcional en GCP.
- Los videos se sirvan desde GCS en el entorno cloud.
- Analítica, Redis, inscripciones y notificaciones estén implementados y demostrables.
- La documentación coincida con el esquema y el código real.
- El entorno local levante con Docker Compose y las pruebas funcionales estén repetidas.
- La decisión de dejar CI/CD fuera de Fase 1 esté documentada.
- Exista un Pull Request aprobado hacia `main`.
- Exista el tag `1.0.0` apuntando al commit de entrega.

Hasta cumplir estos puntos, la entrega debe considerarse **pendiente**.
