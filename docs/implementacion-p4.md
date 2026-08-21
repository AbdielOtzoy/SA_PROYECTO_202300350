# Implementación P4 — Notificaciones y recuperación de acceso

## Alcance

P4 implementa RF-003, RF-004, RF-005 y RF-027–RF-029, además de RNF-006. Identidad mantiene la propiedad de usuarios, contraseñas y tokens de recuperación; Notificaciones mantiene plantillas, preferencias, cola e historial; el Gateway coordina los flujos REST y gRPC.

## Flujos implementados

| Flujo | Implementación |
|---|---|
| Recuperación | `POST /api/auth/recovery/request` genera un enlace de 30 minutos y un solo uso; `POST /api/auth/recovery/reset` valida el token y actualiza la contraseña. |
| Preferencias | `GET/PUT /api/notifications/preferences` permite modificar `new_recording` y `admin_notice`; `recovery` y `security` son obligatorias. |
| Registro | El Gateway conserva la confirmación de registro y ahora la inserta como `pending`. |
| Nueva grabación | Catálogo identifica transiciones a publicado; Gateway consulta inscritos por gRPC y envía un lote filtrado por preferencias. |
| Aviso administrativo | `POST /api/admin/notifications` permite seleccionar un rol o curso; `/admin/notificaciones` proporciona la interfaz administrativa. |
| Entrega | `NotificationsWorker` procesa la cola cada 30 segundos, reclama con `SKIP LOCKED`, reintenta y registra `sent` o `failed`. |

## Seguridad y desacoplamiento

Los tokens de recuperación se almacenan como SHA-256 y se invalidan al consumirse. Los flujos internos de recuperación y fanout usan JWT de Gateway de corta duración con permisos específicos. El Gateway no accede a bases ajenas: Identidad resuelve destinatarios y Notificaciones aplica preferencias dentro de su propia base.

## Validación

La suite automatizada cubre tokens, preferencias, plantillas, worker, reintentos, contratos, permisos, destinatarios por rol/curso y componentes frontend. La validación integrada confirmó `npm run verify`, `npm run test:contracts`, `docker compose ... config`, el build/arranque de Compose y los flujos de registro, recuperación, seguridad, preferencias, avisos por rol/curso y fanout de nuevas grabaciones con Mailpit. En condiciones normales el worker entregó los correos en menos de cinco minutos; la prueba observó la cola completamente en `sent`.
