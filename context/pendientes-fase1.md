# Pendientes para completar Proyecto Fase 1

## YoUSAC — Revisión del estado actual

**Fecha de revisión:** 16 de agosto de 2026  
**Repositorio:** `SA_PROYECTO_202300350`  
**Objetivo:** documentar lo que falta completar antes de entregar la Fase 1 definida en [`proyecto1.md`](proyecto1.md).

## 1. Dictamen general

El núcleo desarrollado en las Prácticas 1, 2 y 3 está integrado en el proyecto: arquitectura políglota, comunicación gRPC, autenticación institucional, reproducción, checkpoints, panel administrativo, importación CSV, Stored Procedures y paginación.

P2 —Analítica— quedó completada en esta iteración. Sin embargo, la Fase 1 todavía no está lista para entrega: el enunciado exige, además de los avances de las prácticas, una aplicación funcional en Google Cloud Platform, almacenamiento de videos en Google Cloud Storage, gestión de inscripciones, notificaciones, CI/CD y evidencia formal de integración.

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

### Verificación de P2 completada

No quedan verificaciones pendientes para P2. El entorno local se reconstruyó y levantó con Docker Compose; se validaron autenticación, autorización, catálogo cacheado, registro de vistas, periodos de examen, tendencias, ranking, recomendaciones, TTL de Redis e índices de MongoDB. La suite `npm run verify`, la verificación de contratos y `docker compose config` finalizaron correctamente.

## 3. Pendientes bloqueantes

### P1 — Despliegue funcional en GCP y almacenamiento GCS

El proyecto exige una aplicación funcional en Google Cloud Platform y videos almacenados en Google Cloud Storage.

Situación actual:

- [`docker-compose.cloud.yml`](../docker-compose.cloud.yml) contiene solamente un fragmento de configuración para `playback` y `gateway`.
- Ejecutarlo de forma independiente falla porque `playback` no tiene `image` ni `build`.
- [`services/playback/cmd/playback/main.go`](../services/playback/cmd/playback/main.go) siempre crea el servicio con un directorio local de videos.
- [`services/playback/internal/playback/service.go`](../services/playback/internal/playback/service.go) abre los videos con `os.Open`; no existe cliente ni lectura desde GCS.
- No hay manifiestos, scripts o configuración verificable de GCP.

Acciones necesarias:

- Definir una topología cloud completa y ejecutable.
- Implementar la lectura de videos desde GCS cuando `VIDEO_STORAGE_MODE=gcs`.
- Configurar credenciales mediante variables o Secret Manager, sin subir secretos.
- Desplegar y probar la aplicación en GCP.
- Registrar evidencia: URL, login, catálogo, reproducción, checkpoint y consulta de Redis.

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

### P3 — Implementar el panel de cursos e inscripciones

La pantalla [`frontend/app/cursos/page.tsx`](../frontend/app/cursos/page.tsx) es todavía un estado vacío y muestra que la función estará disponible posteriormente.

Aunque existe el RPC `ListEnrollments` en [`proto/identity.proto`](../proto/identity.proto), falta:

- Ruta REST en el Gateway para consultar inscripciones.
- Integración del Gateway con `ListEnrollments`.
- Panel del estudiante.
- Filtros por semestre, estado y credenciales académicas.
- Visualización de cursos asignados.
- Pruebas de permisos para consultar únicamente las inscripciones propias, salvo el administrador.

### P4 — Completar notificaciones y recuperación de acceso

Actualmente el servicio de notificaciones solo expone `Send` y el registro dispara un correo de bienvenida.

Falta implementar:

- Recuperación de contraseña desde la pantalla de login.
- Actualización y validación de tokens de recuperación.
- Correos de seguridad.
- Preferencias de usuario para avisos opcionales.
- Avisos de publicación de nuevas grabaciones para estudiantes inscritos.
- Avisos administrativos dirigidos por rol o curso.
- Worker o proceso de envío de la cola.
- Garantía documentada de envío en un máximo de cinco minutos.

El enlace de recuperación en [`frontend/app/page.tsx`](../frontend/app/page.tsx) todavía apunta a `#`. La pantalla [`frontend/app/configuracion/page.tsx`](../frontend/app/configuracion/page.tsx) solo muestra información personal y no permite configurar preferencias.

### P5 — Completar ficha detallada y modelo académico

La Fase 1 exige ficha técnica con unidad, fecha, sílabo/material adjunto y docentes/auxiliares participantes.

Actualmente:

- La vista `recording_detail` es prácticamente la misma que `published_catalog`.
- El contrato de catálogo no expone `lecture_date`, materiales adjuntos, sílabo ni listas separadas de docentes y auxiliares.
- La búsqueda usa `topic` como texto, pero no existe un modelo implementado de etiquetas o temas múltiples.

Se debe decidir si estas entidades se implementarán o si se ajustará la documentación para describir únicamente el alcance real.

## 4. Pendientes de infraestructura y calidad

### P6 — Crear CI/CD

No existe `.github/workflows` ni otro pipeline versionado.

Se requiere al menos:

- Compilación de servicios.
- Lint y typecheck.
- Pruebas Node, Go y Python.
- Verificación de contratos protobuf.
- Construcción de imágenes Docker.
- Pipeline de despliegue cloud para cambios aprobados.

### P7 — Revisar Dockerfiles y Compose

Existen Dockerfiles para frontend, Gateway y microservicios, pero PostgreSQL, MongoDB y Redis se consumen directamente mediante imágenes oficiales.

El enunciado de la Fase 1 solicita Dockerfile por cada microservicio, base de datos, caché y Gateway. Se debe confirmar con el docente si se aceptan imágenes oficiales o agregar Dockerfiles auxiliares.

También se debe asegurar que `docker-compose.cloud.yml` sea un archivo independiente y no solamente un override parcial.

### P8 — Revisar seguridad de sesión

La sesión utiliza un JWT con expiración fija de 60 minutos. La documentación de decisiones indica expiración después de 60 minutos de inactividad.

Se debe implementar una estrategia de expiración por inactividad o documentar explícitamente la limitación y confirmar que sea aceptada.

## 5. Pendientes de documentación

### P9 — Sincronizar el modelo de datos con el código

[`docs/base-de-datos/modelo-entidad-relacion.md`](../docs/base-de-datos/modelo-entidad-relacion.md) documenta objetos que no coinciden con los scripts reales.

Ejemplos que deben corregirse o implementarse:

- `topics`, `recording_topics` y `attachments` aparecen documentados, pero no están en `databases/catalog/01-schema.sql`.
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
2. Completar inscripciones y recuperación de acceso.
3. Completar notificaciones, preferencias y avisos automáticos.
4. Completar la ficha detallada y decidir el modelo de temas/materiales.
5. Actualizar los scripts y la documentación del modelo de datos.
6. Agregar CI/CD y validaciones de construcción/despliegue.
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
- Exista CI/CD verificable.
- Exista un Pull Request aprobado hacia `main`.
- Exista el tag `1.0.0` apuntando al commit de entrega.

Hasta cumplir estos puntos, la entrega debe considerarse **pendiente**.
