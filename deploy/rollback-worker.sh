#!/usr/bin/env bash
#
# Roll the worker back to a previously deployed image tag. Run on the VPS from
# the directory holding docker-compose.prod.yml and .env.production:
#
#   IMAGE_TAG=<previous-sha> GHCR_OWNER=<github-owner> ./rollback-worker.sh
#
# The web app rolls back by promoting the previous Vercel deployment.
set -euo pipefail

: "${IMAGE_TAG:?Set IMAGE_TAG to the previous worker image tag (git sha)}"
: "${GHCR_OWNER:?Set GHCR_OWNER to the GitHub owner that publishes the image}"

cd "$(dirname "$0")"

test -f docker-compose.prod.yml || { echo "docker-compose.prod.yml not found" >&2; exit 1; }
test -f .env.production || { echo ".env.production not found" >&2; exit 1; }

export IMAGE_TAG
export GHCR_OWNER

docker compose -f docker-compose.prod.yml pull worker
docker compose -f docker-compose.prod.yml up -d --remove-orphans --wait --wait-timeout 120 worker
echo "Worker rolled back to ${IMAGE_TAG}."
