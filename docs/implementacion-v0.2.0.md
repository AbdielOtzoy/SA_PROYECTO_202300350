# YoUSAC v0.2.0 — implementación local

## Arranque

1. Copiar `.env.example` como `.env` y cambiar `JWT_SECRET`.
2. Instalar `mkcert` una sola vez (`brew install mkcert` en macOS) y ejecutar `./infrastructure/tls/generate-dev-cert.sh`. El comando instala una CA de desarrollo confiable en tu sistema y crea el certificado compartido de `localhost`.
3. Ejecutar `docker compose --env-file .env -f docker-compose.local.yml up --build`.
4. Abrir `https://localhost:3000`. El frontend reenvía internamente `/api` hacia el Gateway; ambos usan el mismo certificado local confiable. El Gateway atiende también en `https://localhost:443` para pruebas directas; Mailpit queda en `http://localhost:8025`.
4. Ingresar con `admin@usac.edu.gt` y contraseña `Admin123!`. La contraseña hash de la semilla corresponde a esa clave.

El vídeo fixture se encuentra en `videos/sample.mp4`; el reproductor lo transmite en chunks gRPC desde el servicio Go. Para volver a inicializar las semillas, ejecutar `docker compose -f docker-compose.local.yml down -v` (esto elimina los volúmenes locales de esta práctica).

## Límites de red

El navegador habla sólo con el Gateway HTTPS. Gateway convierte REST/JSON en gRPC y reenvía el JWT en metadatos internos. Los cinco servicios no publican rutas REST ni puertos de host. La cookie `yousac_session` se emite con `HttpOnly`, `Secure` y `SameSite=Strict`.

| Dominio | Persistencia | Puerto gRPC |
|---|---|---|
| Identidad (NestJS) | PostgreSQL `identity_db` | 50051 |
| Catálogo (NestJS) | PostgreSQL `catalog_db` | 50052 |
| Reproducción (Go) | MongoDB `playback_db` + volumen | 50053 |
| Analítica (Python) | MongoDB `analytics_db`, Redis sólo caché | 50054 |
| Notificaciones (NestJS) | PostgreSQL `notification_db`, Mailpit | 50055 |

## Recorrido de demostración

Inicie sesión, abra Catálogo, seleccione la clase seed, reproduzca unos segundos, pause y recargue: el checkpoint decimal vuelve como posición inicial. En la misma pantalla cambie la valoración. En Administración asigne o revoque un rol al UUID del estudiante que aparece por defecto. El historial se expone en `GET /api/history` y se limita a 20 registros.

## Trazabilidad y SOLID

| Requerimientos | Evidencia |
|---|---|
| RF-001–008 | Identidad, dominios permitidos, RBAC acumulativo y procedimiento `set_user_role` |
| RF-009–018 | Vista `published_catalog`, ficha, votos, función de porcentaje, streaming/checkpoint/historial |
| RF-019 | Analítica semanal en MongoDB con caché Redis |
| RF-027 | adaptador Mailpit/registro de notificación en el Gateway y servicio Notificaciones |

| Principio | Aplicación explícita |
|---|---|
| SRP | Cada microservicio posee un único dominio y su propia base. |
| OCP | Los contratos `.proto` y el adaptador de almacenamiento permiten agregar proveedores sin cambiar el Gateway. |
| LSP | El adaptador local de notificación puede sustituirse por SMTP/cloud manteniendo `NotificationService.Send`. |
| ISP | Cada contrato gRPC contiene operaciones pequeñas por dominio, sin interfaz REST compartida. |
| DIP | Gateway depende de contratos gRPC; reproducción depende de `CatalogService`, no de la BD de Catálogo. |

Los SQL incluyen tablas, semillas, vistas, procedimientos/funciones y triggers de auditoría. Los contratos compartidos están en `proto/`. Antes de entregar, ejecutar `npm run test:contracts`, recorrer el flujo anterior y crear el tag con `git tag v0.2.0` cuando la revisión esté aprobada.
