#!/usr/bin/env bash
#
# Builds and starts the full stack with Docker Compose.
#
#   ./deploy.sh              build and start
#   ./deploy.sh --no-cache   rebuild images from scratch
#   ./deploy.sh --clean      remove containers, images and volumes first

set -euo pipefail

cd "$(dirname "$0")"

info() { echo "==> $1"; }
fail() { echo "Error: $1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker info >/dev/null 2>&1 || fail "Docker is not running."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available."

[ -f .env ] || fail "No .env found. Copy .env.example to .env and fill it in."

# docker compose reads .env itself; this check just fails early with a clear
# message rather than surfacing a substitution error mid-build.
grep -q '^JWT_SECRET=.\+' .env || fail "JWT_SECRET is not set in .env"
grep -q '^MONGO_ROOT_PASSWORD=.\+' .env || fail "MONGO_ROOT_PASSWORD is not set in .env"

if [ "${1:-}" = "--clean" ]; then
  info "Removing existing containers, images and volumes"
  docker compose down --rmi all --volumes --remove-orphans || true
else
  info "Stopping existing containers"
  docker compose down --remove-orphans || true
fi

info "Building images"
if [ "${1:-}" = "--no-cache" ]; then
  docker compose build --no-cache
else
  docker compose build
fi

info "Starting services"
docker compose up -d

info "Waiting for the API to become healthy"
frontend_port="$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2 || true)"
frontend_port="${frontend_port:-3000}"

for _ in $(seq 1 30); do
  if docker compose exec -T backend node -e \
    "require('http').get('http://127.0.0.1:5000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" \
    >/dev/null 2>&1; then
    info "API is healthy"
    break
  fi
  sleep 2
done

echo ""
docker compose ps
echo ""
echo "  Web client:  http://localhost:${frontend_port}"
echo "  API docs:    http://localhost:${frontend_port}/api-docs"
echo ""
echo "  Logs:  docker compose logs -f"
echo "  Stop:  docker compose down"
