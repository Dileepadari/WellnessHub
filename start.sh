#!/usr/bin/env bash
#
# Runs the API and the web client together for local development.
# Both reload on change. Ctrl-C stops both.

set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env and fill it in first." >&2
  exit 1
fi

for dir in server client; do
  if [ ! -d "$dir/node_modules" ]; then
    echo "Installing $dir dependencies..."
    (cd "$dir" && npm install)
  fi
done

pids=()
cleanup() {
  echo ""
  echo "Stopping..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API on http://localhost:5000"
(cd server && npm run dev) &
pids+=($!)

echo "Starting web client on http://localhost:3000"
(cd client && npm run dev) &
pids+=($!)

echo ""
echo "  Web client:  http://localhost:3000"
echo "  API:         http://localhost:5000"
echo "  API docs:    http://localhost:5000/api-docs"
echo "  Health:      http://localhost:5000/health"
echo ""
echo "Press Ctrl-C to stop."

# Exit as soon as either process does, so a crashed API is not hidden.
wait -n
