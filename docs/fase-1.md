# YoUSAC — Informe técnico de la Fase 1

**Curso:** Software Avanzado  
**Proyecto:** YoUSAC — Plataforma académica de video bajo demanda  
**Institución:** Universidad de San Carlos de Guatemala  
**Fecha:** 20 de agosto de 2026  
**Estado:** Implementación funcional completada; pendiente de cierre documental y de integración Git.

## Índice

1. [Introducción](#1-introducción)
2. [Alcance y objetivos](#2-alcance-y-objetivos)
3. [Resumen de implementación P1–P5](#3-resumen-de-implementación-p1p5)
4. [Trazabilidad de requerimientos](#4-trazabilidad-de-requerimientos)
5. [Arquitectura de la solución](#5-arquitectura-de-la-solución)
6. [Modelo de datos](#6-modelo-de-datos)
7. [Funcionalidades implementadas](#7-funcionalidades-implementadas)
8. [Despliegue local y en GCP](#8-despliegue-local-y-en-gcp)
9. [Pruebas y validación](#9-pruebas-y-validación)
10. [Evidencias de entrega](#10-evidencias-de-entrega)
11. [Limitaciones y decisiones pendientes](#11-limitaciones-y-decisiones-pendientes)
12. [Conclusiones](#12-conclusiones)

## 1. Introducción

YoUSAC es una plataforma web para consultar, reproducir y analizar grabaciones de clases universitarias. La solución permite que estudiantes y personal académico accedan a contenido organizado por curso, semestre, unidad y tema, mientras que los administradores gestionan usuarios, roles, catálogo, inscripciones, periodos de examen y notificaciones.

La Fase 1 integra las funcionalidades construidas durante las prácticas anteriores con los módulos P1–P5. El resultado utiliza una arquitectura de microservicios políglota, comunicación interna mediante gRPC y una única entrada externa mediante un API Gateway.

## 2. Alcance y objetivos

Los objetivos técnicos de la fase son:

- Mantener tres lenguajes de backend: TypeScript, Go y Python.
- Aplicar el patrón **Database per Microservice**.
- Centralizar el tráfico externo en el Gateway.
- Usar gRPC sobre HTTP/2 y contratos Protocol Buffers para la comunicación interna.
- Proteger el acceso mediante dominios institucionales, JWT, cookies seguras y OAuth 2.0.
- Implementar catálogo, ficha académica, reproducción, historial, checkpoints, valoraciones, analítica, inscripciones y notificaciones.
- Ejecutar la plataforma en un entorno local reproducible y en Google Cloud Platform.
- Servir los videos del entorno cloud desde Google Cloud Storage.

Los requisitos formales se mantienen en [requerimientos funcionales](requerimientos/funcionales.md), [requerimientos no funcionales](requerimientos/no-funcionales.md) y [proyecto1.md](../context/proyecto1.md).

## 3. Resumen de implementación P1–P5

| Fase | Alcance | Estado |
|---|---|---|
| **P1** | Despliegue funcional en GCP y almacenamiento de videos en GCS | **Completado y validado** |
| **P2** | Analítica, tendencias, ranking, recomendaciones y Redis | **Completado y validado** |
| **P3** | Panel de cursos e inscripciones | **Completado y validado** |
| **P4** | Recuperación de acceso, preferencias y notificaciones por correo | **Completado y validado** |
| **P5** | Ficha detallada, temas, participantes y materiales | **Completado y validado** |

### P1 — GCP y GCS

El despliegue funcional de la plataforma en GCP ya fue realizado y validado. La composición utilizada en la VM es [`docker-compose.gcp.yml`](../docker-compose.gcp.yml), con variables de producción en `.env.gcp` y TLS montado desde la VM.

Playback se ejecuta con `VIDEO_STORAGE_MODE=gcs` y obtiene los objetos mediante Application Default Credentials de la cuenta de servicio asociada a la VM. El bucket utilizado es:

```text
Proyecto GCP: yousac
Región: us-central1
Bucket: yousac-videos-yousac
Modo cloud: VIDEO_STORAGE_MODE=gcs
```

La composición cloud no monta el volumen local `./videos` en Playback. El servicio obtiene los videos mediante streaming desde GCS, mientras que la autorización de reproducción continúa resolviéndose mediante Catálogo.

### P2 — Microservicio de Analítica

Analítica implementa RF-019–RF-023:

- clases más vistas en rangos semanales UTC `[inicio, fin)`;
- temas en tendencia durante periodos de examen;
- ranking por porcentaje de votos positivos, total de votos y título;
- recomendaciones personalizadas por inscripciones, historial, temas y valoraciones;
- periodos de examen administrables;
- caché Redis para catálogo y resultados analíticos;
- consultas gRPC hacia Catálogo, Identidad y Reproducción, sin acceso directo a sus bases de datos.

El catálogo cacheado utiliza TTL máximo de 900 segundos. Las consultas analíticas utilizan TTL máximo de 300 segundos.

### P3 — Cursos e inscripciones

P3 implementa RF-008 y CU-01.10:

- `GET /api/enrollments` para consultar inscripciones;
- filtros por semestre, estado y credenciales académicas;
- consulta propia para estudiantes;
- consulta de otra cuenta únicamente para administradores;
- enriquecimiento de cursos y semestres mediante Catálogo por gRPC;
- pantalla `/cursos` con filtros, estados de carga, error, reintento y lista vacía.

### P4 — Notificaciones y recuperación

P4 implementa RF-003, RF-004, RF-005 y RF-027–RF-029:

- recuperación mediante token aleatorio, hash SHA-256, expiración de 30 minutos y uso único;
- respuesta no enumerativa cuando el correo no existe;
- correos de registro, recuperación y seguridad;
- preferencias editables para `new_recording` y `admin_notice`;
- preferencias obligatorias para `recovery` y `security`;
- cola PostgreSQL con estados `pending`, `processing`, `sent` y `failed`;
- worker con lotes, bloqueo `FOR UPDATE SKIP LOCKED` y reintentos;
- avisos administrativos dirigidos por rol o curso;
- integración con Mailpit mediante SMTP.

### P5 — Ficha académica

P5 implementa RF-009 y RF-010:

- temas normalizados en `topics` y `recording_topics`;
- filtro de catálogo por tema;
- ficha detallada con curso, semestre, unidad y fecha;
- listas separadas de docentes y auxiliares;
- sílabo y materiales como metadatos y URL/ruta;
- compatibilidad con el CSV anterior;
- columnas opcionales `topics` y `attachments_json`.

La carga binaria de adjuntos y la integración de los materiales con GCS quedan fuera de P5. El almacenamiento de videos de Playback en GCS pertenece a P1 y sí se encuentra implementado.

## 4. Trazabilidad de requerimientos

| Requerimientos | Cobertura en la implementación |
|---|---|
| RF-001–RF-007 | Registro institucional, login, OAuth, JWT, roles acumulados, RBAC y gestión administrativa de roles. |
| RF-008 | Panel `/cursos`, filtros de semestre, estado y credenciales, con enriquecimiento desde Catálogo. |
| RF-009–RF-012 | Catálogo filtrable, ficha detallada, gestión de contenido y permisos por curso/rol. |
| RF-013–RF-018 | Streaming, checkpoints, historial de 20 elementos, votos y porcentaje de recomendación. |
| RF-019–RF-023 | Más vistas, periodos, tendencias, ranking, recomendaciones y Redis. |
| RF-024–RF-026 | Importación transaccional de catálogo, grabaciones e inscripciones mediante CSV y procedimientos almacenados. |
| RF-027–RF-029 | Correos de registro, publicación de grabaciones y avisos administrativos. |
| RNF-004–RNF-005 | TTL de Redis de 900 y 300 segundos, respectivamente. |
| RNF-006 | Worker de correo con entrega normal documentada en un máximo de cinco minutos. |
| RNF-008–RNF-011 | Cookies `HttpOnly` y `Secure`, hash de contraseñas, JWT interno y secretos mediante `.env`. |
| RNF-012–RNF-025 | Microservicios políglotas, bases independientes, gRPC, vistas, funciones, procedimientos y triggers. |
| RNF-026–RNF-030 | Volumen local, GCS en cloud, Dockerfiles, Docker Compose y despliegue en GCP. |
| RNF-034 | Los cambios destinados a la rama principal deben integrarse mediante Pull Request. |

CI/CD (RNF-032 y RNF-033) queda fuera del alcance de esta fase por confirmación docente. La construcción y el despliegue se realizan mediante Docker Compose en la VM de GCP.

## 5. Arquitectura de la solución

### Componentes principales

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Next.js | Interfaz web, navegación y estados de usuario. |
| API Gateway | NestJS/TypeScript | Único punto REST externo, autenticación, autorización y adaptación REST/gRPC. |
| Identidad | NestJS/TypeScript | Usuarios, roles, permisos, sesiones, recuperación e inscripciones. |
| Catálogo | NestJS/TypeScript | Escuelas, cursos, semestres, grabaciones, temas, participantes, adjuntos y valoraciones. |
| Reproducción | Go | Streaming, checkpoints, historial y eventos de reproducción. |
| Analítica | Python | Vistas, tendencias, ranking, recomendaciones y caché. |
| Notificaciones | NestJS/TypeScript | Preferencias, plantillas, cola, worker e historial de correos. |

### Comunicación

El navegador se comunica únicamente con el Gateway mediante HTTPS y REST/JSON. El Gateway y los microservicios se comunican mediante gRPC sobre HTTP/2, utilizando los contratos de:

- [`proto/identity.proto`](../proto/identity.proto)
- [`proto/catalog.proto`](../proto/catalog.proto)
- [`proto/playback.proto`](../proto/playback.proto)
- [`proto/analytics.proto`](../proto/analytics.proto)
- [`proto/notifications.proto`](../proto/notifications.proto)

Los JWT se propagan mediante metadata gRPC y los servicios internos vuelven a validar los permisos recibidos. Ningún servicio consulta directamente la base de datos de otro servicio.

### Vistas de arquitectura y despliegue

La documentación completa del modelo 4+1 se encuentra en [`arquitectura/modelo-4-1.md`](arquitectura/modelo-4-1.md). Los diagramas editables y sus renderizados son:

- [Vista lógica](arquitectura/img/vista-logica.drawio.svg) · [fuente](arquitectura/img/vista-logica.drawio)
- [Vista de procesos](arquitectura/img/vista-procesos.drawio.svg) · [fuente](arquitectura/img/vista-procesos.drawio)
- [Vista de componentes](arquitectura/img/vista-componentes.drawio.svg) · [fuente](arquitectura/img/vista-componentes.drawio)
- [Despliegue local](arquitectura/img/vista-despliegue-local.drawio.svg) · [fuente](arquitectura/img/vista-despliegue-local.drawio)
- [Despliegue cloud GCP](arquitectura/img/vista-despliegue-nube.drawio.svg) · [fuente](arquitectura/img/vista-despliegue-nube.drawio)

Los diagramas de despliegue representan explícitamente el proveedor OAuth institucional como agente externo, Mailpit como agente SMTP y Google Cloud Storage como almacenamiento de videos en la nube.

## 6. Modelo de datos

La persistencia conserva el patrón **Database per Microservice** y se documenta en [`base-de-datos/modelo-entidad-relacion.md`](base-de-datos/modelo-entidad-relacion.md).

| Servicio | Motor | Objetos principales |
|---|---|---|
| Identidad | PostgreSQL | `users`, `password_reset_tokens`, `roles`, `permissions`, `user_roles`, `user_enrollments`, `credential_audit_log`. |
| Catálogo | PostgreSQL | `schools`, `courses`, `semesters`, `professors`, `course_staff`, `recordings`, `recording_professors`, `topics`, `recording_topics`, `attachments`, `ratings`. |
| Notificaciones | PostgreSQL | `templates`, `user_preferences`, `email_queue`, `email_log`. |
| Reproducción | MongoDB | `checkpoints`, `playback_history`, `playback_events`. |
| Analítica | MongoDB | `views`, `trends`, `exam_periods`. |
| Analítica | Redis | Caché de catálogo, más vistas, tendencias, ranking y recomendaciones. |

### Lógica programable

- Identidad utiliza `set_user_role`, `sp_import_enrollments_csv`, `get_user_permissions` y triggers de auditoría.
- Catálogo utiliza `published_catalog`, `recording_detail`, `recommendation_percentage`, procedimientos de asignación e importación y el trigger de valoraciones.
- Notificaciones implementa la cola y el worker en TypeScript.
- Reproducción utiliza `upsert`, índices y TTL de MongoDB.
- Analítica utiliza pipelines de MongoDB y operaciones Redis con TTL.

Las referencias entre bases de distintos servicios son lógicas; no existen llaves foráneas entre microservicios.

## 7. Funcionalidades implementadas

### Usuarios, seguridad y roles

- Restricción a dominios institucionales configurables.
- Registro, login, logout y consulta de sesión.
- OAuth 2.0 institucional mediante Authorization Code Flow y validación de `state`.
- Roles `student`, `teacher`, `assistant` y `admin`.
- Cookies de sesión `HttpOnly`, `Secure` y `SameSite=Strict`.
- JWT internos para las llamadas gRPC.
- Recuperación de contraseña con enlace de un solo uso.

### Administración académica

- CRUD de escuelas, cursos, semestres y perfiles de docentes.
- Asignación y revocación de personal por curso.
- Importación transaccional de catálogo, grabaciones e inscripciones.
- Exportaciones y paneles administrativos.

### Catálogo y reproducción

- Búsqueda, filtros académicos, paginación de máximo 10 elementos y filtro por tema.
- Ficha técnica de la grabación.
- Visualización separada de docentes, auxiliares y materiales.
- Streaming local desde volumen Docker.
- Streaming cloud desde GCS.
- Checkpoints, historial y reanudación.
- Valoraciones positivas/negativas y porcentaje de recomendación.

### Analítica

- Clases más vistas por semana.
- Temas en tendencia durante periodos de examen.
- Ranking de clases mejor valoradas.
- Recomendaciones diferentes según el usuario autenticado.
- Caché con invalidación después de vistas y mutaciones de catálogo.

### Notificaciones

- Correos de registro, recuperación y seguridad.
- Preferencias de nuevas grabaciones y avisos administrativos.
- Fanout de publicaciones a estudiantes inscritos.
- Avisos por rol o curso.
- Worker SMTP/Mailpit con reintentos y estados auditables.

## 8. Despliegue local y en GCP

### Entorno local

El entorno local se levanta con [`docker-compose.local.yml`](../docker-compose.local.yml). Incluye:

- tres PostgreSQL;
- dos MongoDB;
- Redis;
- Mailpit;
- frontend, Gateway y los cinco microservicios;
- volumen local `./videos` para Playback.

La interfaz web de Mailpit se publica en el puerto `8025` y el SMTP interno utiliza el puerto `1025`.

### Entorno cloud

El despliegue cloud funcional ya fue ejecutado en una VM de Compute Engine dentro del proyecto GCP `yousac`, región `us-central1`.

La VM utiliza [`docker-compose.gcp.yml`](../docker-compose.gcp.yml), que:

- construye las imágenes de la aplicación;
- mantiene las bases y Redis dentro de la red privada de Docker;
- no monta el volumen local de videos en Playback;
- configura Playback para GCS;
- publica la aplicación mediante HTTPS;
- mantiene Mailpit accesible únicamente desde la VM mediante `127.0.0.1:8025`;
- aplica `restart: unless-stopped` a los servicios.

PostgreSQL, MongoDB y Redis se despliegan mediante imágenes oficiales. Esta decisión fue aceptada para la Fase 1, por lo que no se crean Dockerfiles auxiliares para esas dependencias. Los Dockerfiles propios se mantienen para el frontend, el Gateway y los microservicios.

El archivo `docker-compose.cloud.yml` se conserva como override compatible con el entorno local; la composición completa utilizada en la VM de GCP es `docker-compose.gcp.yml`.

La cuenta de servicio asociada a la VM dispone de permiso de lectura sobre `gs://yousac-videos-yousac`. Los objetos de video se guardan con rutas relativas, por ejemplo `sample6.mp4`.

La guía operativa se encuentra en [`despliegue-gcp.md`](despliegue-gcp.md), [`implementacion-gcs.md`](implementacion-gcs.md) y [`comandos-reinicio-vm-gcp.md`](comandos-reinicio-vm-gcp.md).

## 9. Pruebas y validación

### Pruebas automatizadas actuales

| Comando | Resultado |
|---|---|
| `npm test` | Correcto: pruebas Node, Go y Python. |
| `npm run lint` | Correcto: ESLint y Ruff. |
| `npm run typecheck` | Correcto: TypeScript y `go vet`. |
| `npm run test:contracts` | Correcto: contratos, topología y cookie segura. |
| `docker compose --env-file .env -f docker-compose.local.yml config --quiet` | Correcto. |
| `npm run verify` | Requiere repetir después de corregir el formato de `docker-compose.gcp.yml`; las etapas de lint, tipos, pruebas y contratos pasan individualmente. |

### Validación Docker y navegador

La validación funcional local incluyó:

- login por roles;
- catálogo, filtro por tema y ficha detallada;
- reproducción, checkpoint e historial;
- consulta y filtros de inscripciones;
- más vistas, tendencias, ranking y recomendaciones;
- recuperación de acceso y reutilización inválida del token;
- preferencias, avisos administrativos y Mailpit;
- importación CSV compatible y con temas/materiales.

El despliegue funcional cloud fue levantado y validado en la VM de GCP. La validación confirmó el acceso a la plataforma, la autenticación, el catálogo, la reproducción desde GCS, los checkpoints y la consulta de Redis.

## 10. Evidencias de entrega

Antes de presentar la fase se deben incorporar al documento de entrega las capturas o registros obtenidos durante la validación cloud. La URL o IP pública no se versiona en este informe porque depende de la configuración de la VM.

La evidencia recomendada es:

1. Acceso a la aplicación desplegada en GCP.
2. Login institucional y navegación según el rol.
3. Catálogo y ficha académica.
4. Reproducción de un objeto que exista únicamente en GCS.
5. Checkpoint e historial.
6. Consulta de Redis para catálogo o analítica.
7. Inscripciones con filtros.
8. Recuperación de acceso y correo en Mailpit.
9. Preferencias y aviso administrativo.
10. Estado de los servicios Docker y ausencia del volumen local de videos en Playback.

Las evidencias existentes de prácticas anteriores están en [`docs/evidence/`](evidence/) y las guías técnicas complementarias son:

- [`implementacion-v0.2.0.md`](implementacion-v0.2.0.md) — Analítica y Redis.
- [`implementacion-p4.md`](implementacion-p4.md) — Notificaciones y recuperación.
- [`implementacion-p5.md`](implementacion-p5.md) — Ficha y modelo académico.
- [`practica-3.md`](practica-3.md) — Administración, CSV e inscripciones.

## 11. Limitaciones y decisiones pendientes

- **Expiración por inactividad:** el JWT de sesión tiene una expiración fija de 60 minutos; no existe una sesión deslizante ni registro de última actividad. Debe implementarse RNF-007 o documentarse la aceptación explícita de esta limitación.
- **CI/CD:** queda fuera de Fase 1 por confirmación docente. El despliegue actual se realiza con Docker Compose en la VM.
- **Correo real:** Mailpit se utiliza como agente SMTP de demostración. Para producción debe configurarse un proveedor SMTP externo.
- **Adjuntos:** P5 maneja metadatos y URL/ruta; no implementa carga binaria.
- **Persistencia cloud:** PostgreSQL, MongoDB y Redis se ejecutan dentro de la VM con volúmenes Docker; no son servicios administrados de GCP.
- **Composición cloud:** el despliegue operativo utiliza `docker-compose.gcp.yml`; `docker-compose.cloud.yml` permanece como override de compatibilidad.
- **TLS de demostración:** puede utilizarse un certificado autofirmado; para una URL pública sin advertencias se requiere un dominio y un certificado válido.
- **Integración Git:** la creación de Pull Requests y el tag `1.0.0` corresponden al cierre final del repositorio y se realizarán posteriormente.

## 12. Conclusiones

La Fase 1 integra una plataforma funcional de video académico con arquitectura de microservicios políglota, comunicación gRPC, persistencia independiente, caché Redis, recuperación de acceso, notificaciones, analítica, inscripciones y ficha académica.

El despliegue funcional en GCP ya se encuentra realizado. En el entorno cloud, Playback utiliza Google Cloud Storage con el bucket `yousac-videos-yousac`, mientras que la plataforma conserva la misma separación de responsabilidades y comunicación interna que en el entorno local.

El desarrollo funcional P1–P5 está completo. Para cerrar formalmente la entrega todavía deben resolverse la decisión sobre RNF-007, la corrección final de documentación y formato, la incorporación de evidencias cloud al expediente y la integración final mediante Pull Requests y el tag de entrega.
