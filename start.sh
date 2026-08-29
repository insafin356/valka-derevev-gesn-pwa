#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
PORT="${PORT:-8080}"
python3 -m http.server "$PORT" &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' INT TERM EXIT
sleep 1
URL="http://localhost:$PORT/"
printf 'Приложение запущено: %s\n' "$URL"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
fi
wait "$SERVER_PID"
