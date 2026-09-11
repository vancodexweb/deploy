#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="feedback-app:latest"
VOLUME="feedback-app-launch-data"
OLD=feedback-app
NEW=feedback-app-new

docker compose build
docker volume create "$VOLUME" >/dev/null

docker rm -f "$NEW" >/dev/null 2>&1 || true

docker run -d --name "$NEW" \
  --network nginx-proxy \
  --env-file .env \
  --restart unless-stopped \
  -v "$VOLUME:/app/data" \
  "$IMAGE"

echo "==> Waiting for $NEW to become healthy"
STATUS="starting"
for _ in $(seq 1 30); do
  STATUS=$(docker inspect -f '{{.State.Health.Status}}' "$NEW" 2>/dev/null || echo "none")
  if [ "$STATUS" = "healthy" ]; then
    break
  fi
  sleep 1
done

if [ "$STATUS" != "healthy" ]; then
  echo "!! $NEW did not become healthy (status: $STATUS) — aborting, old container kept running" >&2
  docker logs "$NEW" --tail 50 || true
  docker rm -f "$NEW" >/dev/null 2>&1 || true
  exit 1
fi

echo "==> $NEW is healthy, switching over"
docker rm -f "$OLD" >/dev/null 2>&1 || true
docker rename "$NEW" "$OLD"
docker image prune -f >/dev/null

echo "==> Deploy finished, $OLD is running the new image"
