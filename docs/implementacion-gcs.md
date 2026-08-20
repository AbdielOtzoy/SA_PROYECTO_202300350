# Implementación de videos en Google Cloud Storage

## Alcance

Playback puede leer los objetos de video desde Google Cloud Storage sin cargar el archivo completo en memoria. El servicio mantiene la autorización en Catálogo y, después de recibir una respuesta autorizada, abre el objeto mediante el cliente oficial de Cloud Storage para Go.

La selección se realiza con `VIDEO_STORAGE_MODE`:

- `local`: usa `VIDEO_ROOT` y el volumen `./videos` del entorno local.
- `gcs`: usa `GCS_BUCKET`, `GCS_PREFIX` opcional y Application Default Credentials (ADC).

El valor de `video_path` debe ser el nombre relativo del objeto, por ejemplo `sample6.mp4` o `recordings/2026/sample6.mp4`. No se deben guardar rutas absolutas del sistema como `/videos/sample6.mp4` cuando se utilice GCS.

## Configuración local

Con el proyecto `yousac` seleccionado y las credenciales ADC configuradas:

```bash
gcloud config set project yousac
gcloud auth application-default login
gcloud storage ls gs://yousac-videos-yousac
```

En el archivo `.env` local:

```dotenv
VIDEO_STORAGE_MODE=local
GCS_BUCKET=yousac-videos-yousac
GCS_PROJECT_ID=yousac
GCS_PREFIX=
```

Para probar GCS desde Docker Desktop se utiliza el override `docker-compose.gcs-local.yml`. El archivo de credenciales se monta únicamente como lectura y no se versiona:

```bash
GOOGLE_APPLICATION_CREDENTIALS_HOST="$HOME/.config/gcloud/application_default_credentials.json" \
docker compose --env-file .env \
  -f docker-compose.local.yml \
  -f docker-compose.gcs-local.yml \
  up --build -d playback
```

Comprobaciones:

```bash
GOOGLE_APPLICATION_CREDENTIALS_HOST="$HOME/.config/gcloud/application_default_credentials.json" \
docker compose --env-file .env \
  -f docker-compose.local.yml \
  -f docker-compose.gcs-local.yml \
  logs --no-color --tail=100 playback

GCS_BUCKET=yousac-videos-yousac \
GCS_TEST_OBJECT=sample6.mp4 \
GCS_PROJECT_ID=yousac \
go test ./services/playback/internal/storage -run TestGCSVideoStorageOpensConfiguredObject -count=1 -v
```

La prueba de integración requiere ADC disponible en el equipo y sólo lee los primeros bytes del objeto configurado.

## Configuración en GCP

En GCP no se debe copiar el archivo ADC personal. El servicio debe ejecutarse con una cuenta de servicio asociada al runtime, con permiso mínimo de lectura de objetos sobre el bucket, por ejemplo `roles/storage.objectViewer`. El cliente de Go detecta las credenciales mediante ADC.

La composición cloud completa [`docker-compose.gcp.yml`](../docker-compose.gcp.yml) inyecta:

```dotenv
VIDEO_STORAGE_MODE=gcs
GCS_BUCKET=yousac-videos-yousac
GCS_PROJECT_ID=yousac
GCS_PREFIX=
```

El archivo [`docker-compose.cloud.yml`](../docker-compose.cloud.yml) se conserva como override heredado para pruebas sobre la composición local; para la VM debe utilizarse `docker-compose.gcp.yml` junto con `.env.gcp`. Todavía falta ejecutar el despliegue cloud y registrar la evidencia funcional.

## Seguridad y operación

- El bucket debe permanecer privado y usar IAM para controlar el acceso.
- No se deben subir `.env`, archivos ADC ni claves JSON al repositorio.
- `GCS_PREFIX` permite separar los objetos de YoUSAC dentro del bucket sin cambiar los nombres guardados en Catálogo.
- La interfaz `VideoStorage` usa streaming y mantiene compatibilidad con el modo local.
- Las rutas absolutas y los intentos de escape mediante `..` son rechazados.

## Estado de P1

La lectura de videos desde GCS está implementada y validada con el bucket `yousac-videos-yousac` y el objeto `sample6.mp4`. P1 no está cerrada: todavía falta el despliegue funcional de la plataforma completa en GCP, la evidencia de navegación/reproducción en la URL pública y la automatización CI/CD.
