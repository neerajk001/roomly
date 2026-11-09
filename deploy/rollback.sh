#!/usr/bin/env bash
#
# Roll the web + worker images back to a previously deployed tag. Run on the
# VPS from the directory holding docker-compose.prod.yml, .env.production and
# host Nginx configuration:
#
#   IMAGE_TAG=<previous-sha> GHCR_OWNER=<github-owner> ./deploy/rollback.sh
set -euo pipefail

: "${IMAGE_TAG:?Set IMAGE_TAG to the previous image tag (git sha)}"
: "${GHCR_OWNER:?Set GHCR_OWNER to the GitHub owner that publishes the images}"

cd "$(dirname "$0")/.."

test -f docker-compose.prod.yml || { echo "docker-compose.prod.yml not found" >&2; exit 1; }
test -f .env.production || { echo ".env.production not found" >&2; exit 1; }

export IMAGE_TAG
export GHCR_OWNER

docker compose --env-file .env.production -f docker-compose.prod.yml pull web worker
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans --wait --wait-timeout 180 web worker
echo "Rolled back web + worker to ${IMAGE_TAG}."
