# YoUSAC v0.2.0 — implementación local

## Arranque

1. Copie `.env.example` como `.env`, cambie `JWT_SECRET` y complete las credenciales OAuth si se demostrará ese flujo.
2. Instale `mkcert` y ejecute `./infrastructure/tls/generate-dev-cert.sh` para crear el certificado local de `localhost`.
3. Ejecute `docker compose --env-file .env -f docker-compose.local.yml up --build`.
4. Abra `https://localhost:3000`. El frontend Next.js reenvía `/api` al Gateway NestJS HTTPS. Los microservicios no publican REST ni puertos de host.

El callback que debe registrarse en Google es `https://localhost:3000/api/auth/google/callback`.

## Registro y sesión

El inicio de sesión ofrece contraseña y OAuth institucional. El enlace **Regístrate aquí** abre `/registro`, que valida visualmente los dominios configurados para la práctica y envía `POST /api/auth/register`; una respuesta correcta emite la cookie segura de sesión y redirige al catálogo. La validación definitiva también se realiza en Gateway e Identidad.

Los dominios locales por defecto son `ingenieria.usac.edu.gt` e `ing.usac.edu.gt`, definidos por `ALLOWED_EMAIL_DOMAINS`. El JWT expira según `JWT_EXPIRES_IN`; no se implementa un temporizador de inactividad independiente.

## gRPC y persistencia

| Dominio | Persistencia | Dirección/bind configurable |
|---|---|---|
| Identidad (NestJS) | PostgreSQL `identity_db` | `IDENTITY_GRPC_ADDRESS`, `IDENTITY_GRPC_BIND` |
| Catálogo (NestJS) | PostgreSQL `catalog_db` | `CATALOG_GRPC_ADDRESS`, `CATALOG_GRPC_BIND` |
| Reproducción (Go) | MongoDB `playback_db` + vídeos locales | `PLAYBACK_GRPC_ADDRESS`, `PLAYBACK_GRPC_BIND` |
| Analítica (Python) | MongoDB `analytics_db` + Redis para tendencias | `ANALYTICS_GRPC_ADDRESS`, `ANALYTICS_GRPC_BIND` |
| Notificaciones (NestJS) | PostgreSQL `notification_db` + Mailpit | `NOTIFICATIONS_GRPC_ADDRESS`, `NOTIFICATIONS_GRPC_BIND` |

El Gateway usa `GRPC_TIMEOUT_MS` (5000 por defecto) para llamadas unary y streaming. Los errores internos se expresan como HTTP coherente: no autenticado 401, sin permiso 403, inexistente 404, no disponible 503 y deadline agotado 504.

Identidad usa el procedimiento PostgreSQL `set_user_role` con `CALL set_user_role(...)`; se conservan la función de permisos, las vistas y los triggers de auditoría existentes.
En un volumen creado por una versión anterior, aplique una vez `databases/identity/03-migrate-set-user-role.sql`; las instalaciones nuevas reciben el procedimiento desde `01-schema.sql`.

Docker Compose espera los healthchecks de PostgreSQL, MongoDB y Redis antes de iniciar los servicios que los consumen y reinicia los servicios de aplicación con `unless-stopped`.

## Recorrido de demostración

Desde una sesión limpia:

1. Registre una cuenta con correo institucional y compruebe la redirección al catálogo.
2. Intente registrar `persona@example.com` y confirme el rechazo del cliente y del Gateway.
3. Inicie OAuth con una cuenta institucional válida y confirme el callback `/api/auth/google/callback`.
4. Abra una grabación, reproduzca, pause, recargue y confirme que se restaura el checkpoint guardado cada cinco segundos, en pausa y al finalizar.
5. Vote una grabación y recargue para verificar persistencia.
6. Abra una ruta protegida sin cookie de sesión y confirme la denegación.

Ejecute antes de entregar `npm test`, `npm run test:contracts`, la construcción de imágenes y `docker compose --env-file .env -f docker-compose.local.yml up --build`. No se crea ningún tag como parte de esta entrega.
