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

| Servicio | Responsabilidad | Persistencia |
|---|---|---|
| Identidad | Registro, login, roles y sesiones | PostgreSQL `identity_db` |
| Catálogo | Grabaciones, búsquedas, permisos y votos | PostgreSQL `catalog_db` |
| Reproducción | Streaming, historial y checkpoints | MongoDB `playback_db`, vídeos locales |
| Analítica | Registro y consulta de tendencias | MongoDB `analytics_db`, Redis |
| Notificaciones | Avisos de registro | PostgreSQL `notification_db`, Mailpit |

## Contratos gRPC

Los contratos por dominio están en `proto/*.proto`: `identity.proto`, `catalog.proto`, `playback.proto`, `analytics.proto` y `notifications.proto`. Las direcciones y binds se controlan con `*_GRPC_ADDRESS` y `*_GRPC_BIND`; el Gateway aplica `GRPC_TIMEOUT_MS` (5000 ms por defecto) tanto a llamadas unary como al streaming.

Para que Go sea reproducible en un checkout limpio, los stubs de catálogo y reproducción están versionados en `services/playback/gen/`. El Dockerfile los compila directamente, por lo que no genera contratos durante la imagen.

## Autenticación y sesión

Registro y login verifican los dominios definidos en `ALLOWED_EMAIL_DOMAINS` (por defecto `ingenieria.usac.edu.gt` e `ing.usac.edu.gt`) en Gateway e Identidad. La cookie `yousac_session` es `HttpOnly`, `Secure` y `SameSite=Strict`.

El JWT vence de forma fija a los **60 minutos** (`JWT_EXPIRES_IN=60m`). Esta entrega no implementa renovación, refresh token ni sesión deslizante. OAuth institucional mantiene el callback `https://localhost:3000/api/auth/google/callback` y no fue modificado en este cierre.

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

## Docker y configuración

1. Copie `.env.example` a `.env`, cambie `JWT_SECRET` y complete OAuth sólo si se demostrará ese flujo.
2. Ejecute `./infrastructure/tls/generate-dev-cert.sh` para el certificado local.
3. Construya y levante: `docker compose --env-file .env -f docker-compose.local.yml up --build`.
4. Abra `https://localhost:3000`.

Compose espera los healthchecks de PostgreSQL, MongoDB y Redis; las aplicaciones usan `restart: unless-stopped`. Los microservicios no publican REST ni puertos al host. Las variables disponibles y valores de ejemplo se encuentran en `.env.example`; nunca se debe versionar `.env`.

## Evidencia SOLID

| Principio | Evidencia en el código |
|---|---|
| SRP | `IdentityGrpc` transporta RPC; `IdentityDomain` concentra registro, login y usuarios en `services/identity/src/main.ts`. |
| OCP | Gateway añade clientes por servicio en `gateway/src/grpc.ts` y extiende contratos sin acoplar implementaciones. |
| LSP | Los servidores de Identidad, Catálogo y Reproducción respetan los métodos y mensajes definidos por Protocol Buffers. |
| ISP | Los contratos están separados por dominio: `identity.proto`, `catalog.proto`, `playback.proto`, `analytics.proto` y `notifications.proto`. |
| DIP | Gateway y Reproducción consumen clientes y contratos gRPC; no importan implementaciones internas de otros servicios. |

## Pruebas y demostración

En un checkout limpio ejecute:

```sh
npm test
npm run test:contracts
docker compose --env-file .env -f docker-compose.local.yml build
docker compose --env-file .env -f docker-compose.local.yml up -d
```

`npm test` también ejecuta `go test ./...` dentro de `services/playback`. Antes de la entrega se debe comprobar manualmente que el frontend responde, una ruta protegida sin sesión devuelve 401, un correo externo devuelve 400, credenciales incorrectas devuelven 401 y una sesión válida consulta el catálogo.

## Limitaciones y conclusiones

El flujo OAuth fue validado manualmente y permanece fuera de los cambios automatizados de este cierre. No hay renovación de token ni sesión deslizante; al vencer el JWT se requiere iniciar sesión otra vez.

La solución deja una topología políglota, contratos gRPC reproducibles, errores de autenticación consistentes y una ruta de validación repetible. Tras completar las validaciones, el cierre de la entrega se identifica mediante el tag anotado `0.2.0`.
