#!/usr/bin/env sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <ip-publica-o-dominio> [directorio-salida]" >&2
  exit 1
fi

host="$1"
output_dir="${2:-deploy/tls}"
mkdir -p "$output_dir"

case "$host" in
  *[!0-9.]* ) san="DNS:$host" ;;
  * ) san="IP:$host" ;;
esac

openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
  -keyout "$output_dir/server.key" \
  -out "$output_dir/server.crt" \
  -subj "/CN=$host" \
  -addext "subjectAltName=$san"

chmod 600 "$output_dir/server.key"
chmod 644 "$output_dir/server.crt"
echo "Certificado creado en $output_dir para $host"
