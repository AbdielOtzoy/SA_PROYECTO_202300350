#!/usr/bin/env sh
set -eu

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert no está instalado. En macOS: brew install mkcert" >&2
  exit 1
fi

tls_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
mkcert -install
mkcert -cert-file "$tls_dir/localhost.crt" -key-file "$tls_dir/localhost.key" localhost 127.0.0.1 ::1
echo "Certificado local confiable creado en $tls_dir"
