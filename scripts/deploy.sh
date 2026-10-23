#!/usr/bin/env bash
# VPS deploy entrypoint (forced command of the deploy SSH key).
# Pulls origin/main, rebuilds the Vite frontend, reinstalls API deps, restarts PM2.
# Does not touch .env files or databases. Deletes only frontend build output (dist).
#
# Intended path on the VPS (also used by .github/workflows/deploy.yml):
#   /var/www/semaine-industrie/scripts/deploy.sh

set -euo pipefail

#################################################
# Configurable paths / process names            #
#################################################

# App clone root on the VPS (must match production layout).
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/semaine-industrie}"

# PM2 process name (see deploy/ecosystem.config.cjs).
PM2_APP_NAME="${PM2_APP_NAME:-industrie-api}"

# Local healthcheck for the Express API.
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3005/api/v1/health}"

# Deploy log (rotated simply by overwrite per run is fine; append with timestamp).
LOG_FILE="${LOG_FILE:-${DEPLOY_DIR}/logs/deploy.log}"


# Append a timestamped line to the log and stdout.
log() {
  local msg="[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}


# Fail the script with a logged message.
die() {
  log "ERROR: $*"
  exit 1
}


# Ensure log directory exists; never create or modify .env files.
prepare_logging() {
  mkdir -p "$(dirname "$LOG_FILE")"
  touch "$LOG_FILE"
}


# Sync the working tree to origin/main without cleaning untracked secrets/uploads.
sync_git() {
  cd "$DEPLOY_DIR"
  [[ -d .git ]] || die "Not a git repo: $DEPLOY_DIR"

  log "==> git fetch origin"
  git fetch origin

  log "==> git reset --hard origin/main"
  # Preserves gitignored files (backend/.env, uploads, logs, node_modules if ignored).
  git reset --hard origin/main

  # Do not run git clean: never delete uploads, .env, or other untracked data.
}


# Rebuild the Vite frontend into frontend/dist (Nginx document root).
build_frontend() {
  cd "$DEPLOY_DIR/frontend"
  log "==> frontend: npm ci"
  npm ci

  # Only build output may be removed; Vite writes into dist/.
  if [[ -d dist ]]; then
    log "==> frontend: clear previous dist/"
    rm -rf dist
  fi

  log "==> frontend: npm run build"
  npm run build

  [[ -f dist/index.html ]] || die "Frontend build missing dist/index.html"
}


# Install production backend deps and restart PM2 (no migrations, no seed).
restart_backend() {
  cd "$DEPLOY_DIR/backend"

  [[ -f .env ]] || die "Missing backend/.env — configure secrets on the VPS once; this script never writes .env"

  log "==> backend: npm ci --omit=dev"
  npm ci --omit=dev

  command -v pm2 >/dev/null 2>&1 || die "pm2 not found (install once with setup; deploy user needs no sudo)"

  cd "$DEPLOY_DIR"
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    log "==> pm2 restart $PM2_APP_NAME"
    pm2 restart "$PM2_APP_NAME"
  else
    log "==> pm2 start $PM2_APP_NAME"
    pm2 start deploy/ecosystem.config.cjs --only "$PM2_APP_NAME"
  fi
  pm2 save
}


# Curl the local API health endpoint until success or timeout.
health_check() {
  local attempt
  log "==> health check $HEALTH_URL"
  for attempt in $(seq 1 30); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      log "Health OK (attempt $attempt)"
      curl -fsS "$HEALTH_URL" | head -c 200 | tee -a "$LOG_FILE"
      echo | tee -a "$LOG_FILE"
      return 0
    fi
    sleep 1
  done
  die "Health check failed after 30s: $HEALTH_URL"
}


# Main deploy sequence.
main() {
  prepare_logging
  log "======== deploy start ========"
  log "DEPLOY_DIR=$DEPLOY_DIR"

  sync_git
  build_frontend
  restart_backend
  health_check

  log "======== deploy OK ========"
}


main "$@"
