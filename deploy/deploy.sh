#!/usr/bin/env bash
# Déploie front + API sur le VPS (sans Docker).
# Usage (depuis la racine du repo, sur le serveur) :
#   bash deploy/deploy.sh
# Variables optionnelles : APP_ROOT=/var/www/semaine-industrie

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/semaine-industrie}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Frontend build"
cd "$REPO_ROOT/frontend"
npm ci
npm run build

echo "==> Frontend → $APP_ROOT/frontend"
mkdir -p "$APP_ROOT/frontend"
rsync -a --delete "$REPO_ROOT/frontend/dist/" "$APP_ROOT/frontend/"

echo "==> Backend deps"
cd "$REPO_ROOT/backend"
npm ci --omit=dev

echo "==> Backend → $APP_ROOT/backend"
mkdir -p "$APP_ROOT/backend"
rsync -a \
  --exclude node_modules \
  --exclude .env \
  "$REPO_ROOT/backend/" "$APP_ROOT/backend/"
rsync -a "$REPO_ROOT/backend/node_modules/" "$APP_ROOT/backend/node_modules/"

if [[ ! -f "$APP_ROOT/backend/.env" ]]; then
  echo "ATTENTION: créer $APP_ROOT/backend/.env (voir deploy/env.production.example)"
  exit 1
fi

echo "==> Migrations"
cd "$APP_ROOT/backend"
npm run db:migrate

echo "==> Restart API"
systemctl restart semaine-industrie-api
systemctl is-active semaine-industrie-api

echo "==> Healthcheck"
sleep 1
curl -fsS "http://127.0.0.1:3000/api/v1/health" | head -c 200
echo

if command -v nginx >/dev/null 2>&1; then
  echo "==> Nginx reload (si conf déjà installée)"
  nginx -t && systemctl reload nginx || true
fi

echo "OK — déployé sur https://semaine-industrie.mdpise.tg"
