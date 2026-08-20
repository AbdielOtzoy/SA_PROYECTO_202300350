# Despliegue de YoUSAC en GCP con Compute Engine y Docker Compose

## Decisión de despliegue

La primera instalación cloud utiliza una VM de Compute Engine con Debian 12 y Docker Compose. Esta opción reutiliza los Dockerfiles existentes, mantiene la base de datos por microservicio y permite demostrar la aplicación completa sin introducir todavía un orquestador adicional.

La composición cloud es [docker-compose.gcp.yml](../docker-compose.gcp.yml). A diferencia de la composición local, no monta `./videos`, no publica bases de datos, Redis, Mailpit ni Gateway, y expone únicamente el frontend por `443`. Playback obtiene los videos desde GCS mediante la cuenta de servicio de la VM.

## 1. Preparar el proyecto GCP

Desde Cloud Shell o desde un equipo con `gcloud` autenticado:

```bash
gcloud config set project yousac
gcloud services enable compute.googleapis.com storage.googleapis.com
```

La cuenta que ejecuta estos comandos necesita permisos para crear VM, cuenta de servicio, regla de firewall y asignación IAM.

## 2. Crear la identidad de la VM

```bash
gcloud iam service-accounts create yousac-runtime \
  --display-name="YoUSAC runtime"

gcloud storage buckets add-iam-policy-binding gs://yousac-videos-yousac \
  --member="serviceAccount:yousac-runtime@yousac.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

La cuenta sólo necesita leer objetos del bucket. Compute Engine requiere que la VM tenga un scope compatible y la documentación recomienda `cloud-platform` junto con permisos IAM granulares. No se debe crear ni copiar una clave JSON de la cuenta de servicio a la VM.

## 3. Crear la VM

Para esta primera demostración se recomienda `e2-standard-2`, con 2 vCPU y 8 GB de memoria. Las mediciones del entorno local muestran que el stack consume cerca de 1 GB en reposo; los 8 GB dejan margen para Debian, Docker y la construcción de imágenes:

Primero reserva una IP regional para conservar la dirección pública:

```bash
gcloud compute addresses create yousac-ip --region=us-central1
gcloud compute addresses describe yousac-ip \
  --region=us-central1 \
  --format='value(address)'
```

```bash
gcloud compute instances create yousac-vm \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --service-account=yousac-runtime@yousac.iam.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --address=yousac-ip \
  --tags=yousac-web
```

La zona `us-central1-a` es una elección dentro de la región indicada; puede cambiarse por otra zona disponible de `us-central1`.

## 4. Abrir únicamente el acceso web y SSH

```bash
gcloud compute firewall-rules create yousac-allow-web \
  --network=default \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=yousac-web
```

SSH se realiza mediante `gcloud compute ssh` o SSH-in-browser. No se deben abrir los puertos 5432, 27017, 6379, 8025 ni los puertos gRPC al público.

## 5. Instalar Docker en la VM

Conectarse:

```bash
gcloud compute ssh yousac-vm --zone=us-central1-a
```

En la VM, instalar Docker Engine y Compose desde el repositorio oficial de Docker para Debian:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
exit
```

Volver a conectarse para que el grupo `docker` se aplique:

```bash
gcloud compute ssh yousac-vm --zone=us-central1-a
docker run hello-world
docker compose version
```

## 6. Obtener el código y preparar TLS

En la VM, clonar el repositorio y entrar a la carpeta:

```bash
git clone <URL_DEL_REPOSITORIO> yousac
cd yousac
cp .env.gcp.example .env.gcp
chmod 600 .env.gcp
```

Obtener la IP externa:

```bash
gcloud compute instances describe yousac-vm \
  --zone=us-central1-a \
  --format='value(networkInterfaces[0].accessConfigs[0].natIP)'
```

Editar `.env.gcp` y reemplazar todos los valores `REEMPLAZAR_*`, especialmente:

- `PUBLIC_HOSTNAME`.
- `JWT_SECRET`; se puede generar con `openssl rand -hex 32`.
- `FRONTEND_URL`, `OAUTH_SUCCESS_URL`, `OAUTH_FAILURE_URL` y `GOOGLE_CALLBACK_URL`.
- `JWT_SECRET`.
- Contraseñas y URLs de las tres bases PostgreSQL.

Para una demostración con IP pública, generar un certificado autofirmado:

```bash
sh deploy/gcp/generate-self-signed-tls.sh <IP_PUBLICA> deploy/tls
```

El navegador mostrará una advertencia porque el certificado no proviene de una autoridad pública. Para una entrega pública formal, utilizar un dominio y un certificado gestionado o Let's Encrypt, conservando los nombres `server.crt` y `server.key`.

## 7. Subir los videos

Desde el equipo local, subir los objetos que el Catálogo referencia:

```bash
gcloud storage cp videos/*.mp4 gs://yousac-videos-yousac/
gcloud storage ls gs://yousac-videos-yousac
```

Los valores de `recordings.video_path` deben ser claves relativas del bucket, por ejemplo `sample6.mp4`, y deben coincidir exactamente con los nombres subidos.

## 8. Validar y levantar la composición cloud

En la VM:

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.yml config --quiet
docker compose --parallel 1 --env-file .env.gcp -f docker-compose.gcp.yml build
docker compose --env-file .env.gcp -f docker-compose.gcp.yml up -d
docker compose --env-file .env.gcp -f docker-compose.gcp.yml ps
```

Revisar los logs si algún servicio no inicia:

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.yml logs --tail=100 playback gateway frontend
```

La prueba de GCS debe mostrar que Playback inició en modo `gcs` y la reproducción desde el navegador debe solicitar `https://<IP_PUBLICA>/api/playback/<id>/stream`.

## 9. Validación funcional de la Fase 1

Registrar evidencia de:

1. URL pública y advertencia/certificado HTTPS.
2. Registro o login institucional.
3. Catálogo y ficha detallada.
4. Reproducción de un objeto que sólo existe en GCS.
5. Checkpoint e historial.
6. Inscripciones y filtros de `/cursos`.
7. Recomendaciones, tendencias y ranking.
8. Recuperación de acceso y mensajes en Mailpit.
9. Preferencias y aviso administrativo.
10. Estado de servicios, Redis y ausencia del volumen `/videos` en Playback.

## 10. Limitaciones conocidas

- Esta primera composición construye las imágenes directamente en la VM; CI/CD y Artifact Registry quedan para P6.
- PostgreSQL, MongoDB y Redis permanecen dentro de la VM con volúmenes persistentes de Docker; no son servicios administrados de GCP.
- Mailpit sirve para demostrar la cola de correo. Para correo real se debe configurar un SMTP externo y sus secretos.
- Un certificado autofirmado es suficiente para una demostración técnica, pero no para una aplicación pública sin advertencias.
