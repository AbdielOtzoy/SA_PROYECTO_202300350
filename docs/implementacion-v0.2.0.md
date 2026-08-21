# YoUSAC v0.2.0 — implementación local

## Índice

1. [Descripción](#descripción)
2. [Arquitectura y servicios](#arquitectura-y-servicios)
3. [Contratos gRPC](#contratos-grpc)
4. [Autenticación y sesión](#autenticación-y-sesión)
5. [Persistencia](#persistencia)
6. [Docker y configuración](#docker-y-configuración)
7. [SOLID](#evidencia-solid)
8. [Pruebas](#pruebas-y-demostración)
9. [Limitaciones y conclusiones](#limitaciones-y-conclusiones)

## Descripción

YoUSAC es una aplicación web para consultar grabaciones académicas, reproducirlas, conservar checkpoints y administrar funciones de catálogo. La entrega v0.2.0 implementa el flujo local completo: el navegador sólo consume el API Gateway; éste orquesta servicios independientes mediante gRPC.

## Arquitectura y servicios

```text
Navegador → Frontend Next.js → Gateway NestJS/HTTPS → gRPC → microservicios
                                                        ├─ Identidad (TypeScript)
                                                        ├─ Catálogo (TypeScript)
                                                        ├─ Reproducción (Go)
                                                        ├─ Analítica (Python)
                                                        └─ Notificaciones (TypeScript)
```

El Gateway es el único punto de entrada. Los diagramas de las vistas lógica, procesos, componentes y despliegue se encuentran en `docs/arquitectura/img/`; el modelo 4+1 se documenta en `docs/arquitectura/modelo-4-1.md`.

La fase P2 de Analítica completa RF-019–RF-023. El Gateway consulta el catálogo a través de `AnalyticsService.GetCatalogPage`, por lo que Analítica administra la caché de catálogo y obtiene los metadatos mediante gRPC. Los resultados de más vistas, tendencias, ranking y recomendaciones se sirven con Redis; Analítica consulta Catálogo, Identidad y Reproducción por gRPC y no accede a sus bases de datos.

La implementación TypeScript usa módulos NestJS por dominio. `main.ts` sólo inicializa el proceso; `app.module.ts` registra módulos y providers; los controllers exponen transporte, los services contienen casos de uso, los repositories encapsulan PostgreSQL y los DTOs/mappers aíslan los mensajes de Protocol Buffers. El Gateway concentra configuración, sesión/JWT, clientes gRPC y el filtro de traducción de errores en `src/common/`. El frontend mantiene sus respuestas de API tipadas y captura errores como `unknown`.

```text
gateway/src/
├── main.ts, app.module.ts
├── common/       configuración, sesión, clientes gRPC y filtro
├── auth/         OAuth, registro, login y sesión
├── catalog/      consulta y valoración
├── playback/     streaming y checkpoints
├── admin/        analítica y asignación de roles
└── analytics/    recomendaciones y tendencias autenticadas

services/{identity,catalog,notifications}/src/
├── main.ts, app.module.ts
├── common/       configuración, autenticación interna y tokens de DB
└── <dominio>/    controller, service, repository, dto y mappers

services/playback/
├── cmd/playback/         bootstrap del proceso
└── internal/{auth,catalog,playback,repository,config}/

services/analytics/
├── app/main.py            bootstrap del proceso
├── app/common/            configuración, JWT y caché
├── app/analytics/         modelos, reglas, periodos y repositorio MongoDB
└── app/transport/         adaptador gRPC y fuentes gRPC hacia otros servicios
```

| Servicio | Responsabilidad | Persistencia |
|---|---|---|
| Identidad | Registro, login, roles y sesiones | PostgreSQL `identity_db` |
| Catálogo | Grabaciones, búsquedas, permisos y votos | PostgreSQL `catalog_db` |
| Reproducción | Streaming, historial y checkpoints | MongoDB `playback_db`, vídeos locales |
| Analítica | Vistas semanales, tendencias de exámenes, ranking, recomendaciones y periodos | MongoDB `analytics_db`, Redis |
| Notificaciones | Avisos de registro | PostgreSQL `notification_db`, Mailpit |

## Contratos gRPC

Los contratos por dominio están en `proto/*.proto`: `identity.proto`, `catalog.proto`, `playback.proto`, `analytics.proto` y `notifications.proto`. Las direcciones y binds se controlan con `*_GRPC_ADDRESS` y `*_GRPC_BIND`; el Gateway aplica `GRPC_TIMEOUT_MS` (5000 ms por defecto) tanto a llamadas unary como al streaming.

El adaptador dinámico de `proto-loader` es el único límite sin tipos del Gateway; controllers y dominio usan DTOs TypeScript explícitos. Analítica genera durante la construcción los stubs Python de `analytics.proto`, `catalog.proto`, `identity.proto` y `playback.proto`. Las llamadas internas reenvían y vuelven a validar el JWT.

Las operaciones nuevas son `GetCatalogPage`, `MostViewed`, `TrendingTopics`, `TopRated`, CRUD de `ExamPeriod`, `Recommendations` e invalidación de cachés. Las señales que Catálogo entrega a Analítica incluyen metadatos de grabación, porcentaje global, votos totales y voto del usuario.

## Autenticación y sesión

Registro y login verifican los dominios definidos en `ALLOWED_EMAIL_DOMAINS` (por defecto `ingenieria.usac.edu.gt` e `ing.usac.edu.gt`) en Gateway e Identidad. La cookie `yousac_session` es `HttpOnly`, `Secure` y `SameSite=Strict`.

El JWT vence de forma fija a los **60 minutos** (`JWT_EXPIRES_IN=60m`). Esta entrega no implementa renovación, refresh token ni sesión deslizante. OAuth institucional mantiene el callback `https://localhost:3000/api/auth/google/callback`, la cookie de state y la validación de dominios; su lógica ahora vive en el módulo `gateway/src/auth/`.

Los errores de credenciales, datos y duplicados se tipan en gRPC y el Gateway los traduce sin exponer detalles internos:

| gRPC | HTTP | Caso |
|---|---:|---|
| `INVALID_ARGUMENT` | 400 | Correo o datos inválidos |
| `UNAUTHENTICATED` | 401 | Credenciales inválidas o sesión ausente |
| `ALREADY_EXISTS` | 409 | Correo ya registrado |
| `PERMISSION_DENIED` | 403 | Operación sin permiso |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `UNAVAILABLE` / `DEADLINE_EXCEEDED` | 503 / 504 | Falla o timeout interno |

## Persistencia

Cada servicio es dueño de su almacenamiento. Identidad usa `CALL set_user_role(...)`; instalaciones nuevas reciben el procedimiento desde `databases/identity/01-schema.sql`. Para un volumen anterior se aplica una vez `databases/identity/03-migrate-set-user-role.sql`. Los diagramas ER y las colecciones se incluyen en `docs/base-de-datos/`.

Los checkpoints se guardan mediante upsert y el historial conserva sólo reproducciones con avance. Los votos son binarios y modificables.

Analítica conserva eventos en `views`, periodos administrativos en `exam_periods` y deja disponible `trends` para resultados materializados. Las consultas semanales y de examen usan rangos UTC semiabiertos `[inicio, fin)`. Los índices cubren `viewed_at`/`recording_id` y las fechas de periodos. Redis usa TTL de 900 segundos para `analytics:catalog:*` y 300 segundos para resultados analíticos; vistas, votos, importaciones y mutaciones administrativas invalidan las claves relacionadas.

## Docker y configuración

1. Copie `.env.example` a `.env`, cambie `JWT_SECRET` y complete OAuth sólo si se demostrará ese flujo.
2. Ejecute `./infrastructure/tls/generate-dev-cert.sh` para el certificado local.
3. Construya y levante: `docker compose --env-file .env -f docker-compose.local.yml up --build`.
4. Abra `https://localhost:3000`.

Compose espera los healthchecks de PostgreSQL, MongoDB y Redis; las aplicaciones usan `restart: unless-stopped`. Los microservicios no publican REST ni puertos al host. Las variables disponibles y valores de ejemplo se encuentran en `.env.example`; nunca se debe versionar `.env`.

## Evidencia SOLID

| Principio | Evidencia en el código |
|---|---|
| SRP | Cada controller sólo adapta RPC/HTTP; `IdentityService`, `CatalogService`, `NotificationsService` y `playback.Service` contienen casos de uso separados de sus repositories. |
| OCP | `GrpcCallService`, `GrpcErrorMapper` y las interfaces `auth.Authorizer`, `catalog.Client`, `repository.Repository` y `analytics.ViewRepository` permiten extender adaptadores sin cambiar los casos de uso. |
| LSP | Los controllers NestJS implementan los métodos de los cinco servicios protobuf y Go embebe `UnimplementedPlaybackServiceServer`; ambos respetan los contratos existentes. |
| ISP | Los contratos permanecen separados por dominio y las interfaces Go/Python exponen sólo las operaciones que necesita cada caso de uso. |
| DIP | Pool, SMTP, clientes gRPC y repositorios se registran como providers NestJS; playback recibe autenticador, cliente de Catálogo y repositorio por interfaces; Analítica recibe repositorio, caché y codec por constructor. |

## Pruebas y demostración

En un checkout limpio ejecute:

```sh
npm run verify
npm run test:contracts
docker compose --env-file .env -f docker-compose.local.yml build
docker compose --env-file .env -f docker-compose.local.yml up -d
```

Los scripts reproducibles son `format`, `format:check`, `lint`, `typecheck`, `test`, `test:analytics`, `test:contracts` y `verify`. `format:human` y `format:human:check` cubren TypeScript, JavaScript, tests, CSS, YAML y configuración JSON; los SQL y Protocol Buffers se mantienen con formato expandido y claro. Ruff y `unittest` se configuran en `services/analytics/requirements-dev.txt`; el adaptador protobuf de Analítica se genera dentro de su imagen Docker. `npm test` ejecuta las pruebas de los workspaces, Go y Python; `npm run typecheck` incluye el frontend y añade `go vet ./...`. `verify` no ejecuta comandos Git; `verify:git` queda disponible para revisar espacios en blanco cuando se prepare el commit.

Las pruebas de P2 cubren rangos semanales, normalización y agrupación de temas, exclusión de grabaciones sin votos, recomendaciones deterministas por usuario, validación de periodos y TTL de caché. La demostración funcional debe registrar una vista, consultar más vistas, crear un periodo, consultar tendencias, consultar ranking, comparar recomendaciones entre dos usuarios y confirmar reutilización de Redis y TTL máximo de 900/300 segundos.

## Limitaciones y conclusiones

El flujo OAuth fue validado manualmente y permanece fuera de los cambios automatizados de este cierre. No hay renovación de token ni sesión deslizante; al vencer el JWT se requiere iniciar sesión otra vez.

La solución deja una topología políglota, contratos gRPC reproducibles, errores de autenticación consistentes y una ruta de validación repetible. Tras completar las validaciones, el cierre de la entrega se identifica mediante el tag anotado `0.2.0`.
